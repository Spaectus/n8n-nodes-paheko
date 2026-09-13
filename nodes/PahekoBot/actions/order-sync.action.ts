import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
	urlencode,
	updateAndValidateCookies,
	bodyToString,
	parseCookies,
	buildCookieJar,
	extractCookies,
	httpFollow,
} from '../lib/login';

export const property: INodeProperties = {
	displayName: 'HelloAsso Order ID',
	name: 'helloassoId',
	type: 'string',
	required: true,
	default: '',
	placeholder: '',
	description: 'HelloAsso order ID to synchronize',
	displayOptions: {
		show: {
			resource: ['helloasso'],
			operation: ['orderSync'],
		},
	},
};

export async function execute(
	this: IExecuteFunctions,
	cookieJar: string,
	baseUrl: string,
	itemIndex: number,
): Promise<IDataObject> {
	const baseUrlClean = baseUrl.replace(/\/$/, '');
	const helloassoId = this.getNodeParameter('helloassoId', itemIndex) as string;
	const url = `${baseUrlClean}/admin/p/helloasso/order.php?id=${helloassoId}`;

	// GET order page
	const orderPageResp = await httpFollow.call(this, 'pahekoApi', url, {
		method: 'GET',
		headers: { Cookie: cookieJar },
		timeout: 15000,
	});

	const cookieJarUpdated = extractCookies(orderPageResp.headers ?? {});
	if (cookieJarUpdated) {
		const parsed = parseCookies(cookieJar);
		const added = parseCookies(cookieJarUpdated);
		Object.assign(parsed, added);
		cookieJar = buildCookieJar(parsed);
	}

	const orderPageHtml = bodyToString(orderPageResp.body);
	if (!orderPageHtml) {
		throw new NodeOperationError(
			this.getNode(),
			`Empty response from order page (status: ${orderPageResp.statusCode ?? 'unknown'})`,
		);
	}

	if (!orderPageHtml.includes('Tout synchroniser')) {
		return { success: true, paheko_error: 'Tout a déjà été synchronisé pour cette commande' };
	}

	// Extract CSRF near sync_all
	const csrfMatch = orderPageHtml.match(
		/name="(ct_[^"]+)"\s+value="([^"]+)"[\s\S]{0,100}?sync_all/,
	);
	if (!csrfMatch) {
		throw new NodeOperationError(this.getNode(), 'CSRF token not found');
	}

	const syncBody: Record<string, string> = {
		sync_all: '1',
		[csrfMatch[1]]: csrfMatch[2],
	};

	// POST
	const syncResp = await httpFollow.call(this, 'pahekoApi', url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Referer: url,
			Cookie: cookieJar,
		},
		body: urlencode(syncBody),
		timeout: 30000,
	});

	const resultHtml = bodyToString(syncResp.body);
	const errorMatch = resultHtml.match(/class="block error"([\s\S]{0,5000})<\/div>/);
	if (errorMatch) {
		return { success: false, paheko_error: errorMatch[1].trim() };
	}

	const { valid } = updateAndValidateCookies(cookieJar, syncResp.headers);
	if (!valid) {
		throw new NodeOperationError(this.getNode(), 'Session invalid after sync');
	}

	return { success: true, paheko_error: null };
}
