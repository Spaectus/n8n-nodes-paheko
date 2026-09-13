import type { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { LoggerProxy, NodeOperationError } from 'n8n-workflow';

const UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.10 Safari/605.1.1';

export function urlencode(params: Record<string, string>): string {
	const parts: string[] = [];
	for (const key in params) {
		parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
	}
	return parts.join('&');
}

export function bodyToString(body: unknown): string {
	if (typeof body === 'string') return body;
	if (body?.toString) return body.toString();
	return String(body);
}

export function parseCookies(cookieHeader: string): Record<string, string> {
	const cookies: Record<string, string> = {};
	if (!cookieHeader) return cookies;
	const attributes = ['path', 'domain', 'max-age', 'expires', 'secure', 'httponly', 'samesite'];
	cookieHeader.split(';').forEach((pair) => {
		const trimmed = pair.trim();
		const [name, ...valueParts] = trimmed.split('=');
		if (name && valueParts.length > 0 && !attributes.includes(name.toLowerCase())) {
			cookies[name] = valueParts.join('=');
		}
	});
	return cookies;
}

export function extractCookies(headers: Record<string, string | string[] | undefined>): string {
	if (!headers) return '';
	for (const key in headers) {
		if (key.toLowerCase() === 'set-cookie') {
			const val = headers[key];
			if (Array.isArray(val)) return val.join('; ');
			return val || '';
		}
	}
	return '';
}

export function buildCookieJar(jar: Record<string, string>): string {
	return Object.entries(jar)
		.map(([name, value]) => `${name}=${value}`)
		.join('; ');
}

export function updateAndValidateCookies(
	cookieJar: string,
	headers: Record<string, string | string[] | undefined>,
): { cookieJar: string; valid: boolean } {
	const existingCookies = parseCookies(cookieJar);
	const newCookiesHeader = extractCookies(headers);
	if (newCookiesHeader) {
		const parsed = parseCookies(newCookiesHeader);
		Object.assign(existingCookies, parsed);
	}
	const jar = buildCookieJar(existingCookies);
	const pkoMatch = existingCookies['pko'];
	if (!pkoMatch) {
		LoggerProxy.warn('[PahekoBot] pko cookie not found after cookie update.');
		return { cookieJar: jar, valid: false };
	}
	return { cookieJar: jar, valid: true };
}

function mergeCookies(jar: Record<string, string>, extra: string): Record<string, string> {
	if (!extra) return jar;
	Object.assign(jar, parseCookies(extra));
	return jar;
}

// Single HTTP helper: disableFollowRedirect controls whether Axios follows 302s
// ignoreHttpStatusErrors prevents throw on 3xx so we can inspect redirect responses
async function httpCall(
	this: IExecuteFunctions,
	credType: string,
	url: string,
	options: {
		method?: string;
		headers?: Record<string, string>;
		body?: string;
		timeout?: number;
		disableFollowRedirect?: boolean;
		ignoreHttpStatusErrors?: boolean;
	} = {},
): Promise<{
	statusCode: number;
	headers: Record<string, string | string[] | undefined>;
	body: unknown;
}> {
	const {
		method = 'GET',
		headers: extraHeaders = {},
		body,
		timeout = 30000,
		disableFollowRedirect,
		ignoreHttpStatusErrors,
	} = options;

	const resp = (await this.helpers.httpRequestWithAuthentication.call(this, credType, {
		url,
		method,
		headers: { ...extraHeaders, 'User-Agent': UA },
		auth: undefined,
		body,
		json: false,
		returnFullResponse: true,
		timeout,
		...(disableFollowRedirect && { disableFollowRedirect: true }),
		...(ignoreHttpStatusErrors && { ignoreHttpStatusErrors: true }),
	} as IHttpRequestOptions)) as { statusCode?: number; headers?: Record<string, string | string[] | undefined>; body?: unknown; _response?: { statusCode?: number; headers?: Record<string, string | string[] | undefined>; body?: unknown } };

	return {
		statusCode: resp?.statusCode ?? resp?._response?.statusCode ?? 200,
		headers: resp?.headers ?? resp?._response?.headers ?? {},
		body: resp?.body ?? resp?._response?.body ?? resp,
	};
}

// Follow redirects automatically (n8n's default behavior)
export async function httpFollow(
	this: IExecuteFunctions,
	credType: string,
	url: string,
	options: {
		method?: string;
		headers?: Record<string, string>;
		body?: string;
		timeout?: number;
		maxRedirects?: number;
	} = {},
): Promise<{
	statusCode: number;
	headers: Record<string, string | string[] | undefined>;
	body: unknown;
}> {
	const {
		method = 'GET',
		headers: extraHeaders = {},
		body,
		timeout = 30000,
		maxRedirects = 10,
	} = options;
	const baseUrlMatch = url.match(/^(https?:\/\/[^/]+)/);
	const baseUrl = baseUrlMatch ? baseUrlMatch[1] : '';
	let currentUrl = url;
	let count = 0;

	while (count++ < maxRedirects) {
		const resp = await httpCall.call(this, credType, currentUrl, {
			method,
			headers: extraHeaders,
			body,
			timeout,
		});

		if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers?.location) {
			let location = Array.isArray(resp.headers.location)
				? resp.headers.location[0]
				: resp.headers.location;
			if (location.startsWith('//')) {
				location = (baseUrl?.match(/^https?:\/\//)?.[0] || 'https://') + location.slice(2);
			} else if (location.startsWith('/')) {
				location = baseUrl + location;
			}
			currentUrl = location;
			continue;
		}

		return resp;
	}

	throw new Error('Too many redirects');
}

// No redirect following — useful for capturing cookies from intermediate redirects
export async function httpNoRedirect(
	this: IExecuteFunctions,
	credType: string,
	url: string,
	options: {
		method?: string;
		headers?: Record<string, string>;
		body?: string;
		timeout?: number;
	} = {},
): Promise<{
	statusCode: number;
	headers: Record<string, string | string[] | undefined>;
	body: unknown;
}> {
	return httpCall.call(this, credType, url, {
		...options,
		disableFollowRedirect: true,
		ignoreHttpStatusErrors: true,
	});
}

export async function login(
	this: IExecuteFunctions,
	baseUrl: string,
	email: string,
	password: string,
): Promise<string> {
	const baseUrlClean = baseUrl.replace(/\/$/, '');
	let cookieJar: Record<string, string> = {};

	// Step 1: GET login page
	const loginPageResp = await httpNoRedirect.call(
		this,
		'pahekoApi',
		`${baseUrlClean}/admin/login.php`,
		{ method: 'GET', timeout: 15000 },
	);

	// Extract set-cookie and update jar
	const newCookies = extractCookies(loginPageResp.headers ?? {});
	if (newCookies) {
		cookieJar = mergeCookies(cookieJar, newCookies);
	}

	const loginPageHtml = bodyToString(loginPageResp.body);
	if (!loginPageHtml) {
		throw new NodeOperationError(
			this.getNode(),
			`Empty response from login page (status: ${loginPageResp.statusCode ?? 'unknown'})`,
		);
	}

	// Step 2: POST login form
	const csrfMatch = loginPageHtml.match(/name="(ct_[^"]+)"\s+value="([^"]+)"/);
	if (!csrfMatch) {
		throw new NodeOperationError(this.getNode(), 'Could not find CSRF token on login page');
	}

	const loginBody = urlencode({
		login: '1',
		id: email,
		password,
		permanent: '1',
		permanent_present: '1',
		[csrfMatch[1]]: csrfMatch[2],
	});

	const loginResp = await httpNoRedirect.call(
		this,
		'pahekoApi',
		`${baseUrlClean}/admin/login.php`,
		{
			method: 'POST',
			body: loginBody,
			headers: {
				Referer: `${baseUrlClean}/admin/login.php`,
				Cookie: buildCookieJar(cookieJar),
			},
			timeout: 15000,
		},
	);

	// Check for login errors
	const loginHtml = bodyToString(loginResp.body);
	const errorMatch = loginHtml.match(/class="block error"([\s\S]{0,5000})<\/div>/);
	if (errorMatch) {
		throw new NodeOperationError(this.getNode(), errorMatch[1]);
	}

	// Update and validate cookies
	const { cookieJar: validatedJar, valid } = updateAndValidateCookies(
		buildCookieJar(cookieJar),
		loginResp.headers,
	);
	if (!valid) {
		throw new NodeOperationError(this.getNode(), 'No pko cookie received after login');
	}
	cookieJar = parseCookies(validatedJar);

	return validatedJar;
}
