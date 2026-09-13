import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
	urlencode,
	extractCookies,
	updateAndValidateCookies,
	bodyToString,
	parseCookies,
	buildCookieJar,
	httpFollow,
} from '../lib/login';

export const syncFormsProperty: INodeProperties = {
	displayName: 'Sync Forms',
	name: 'syncForms',
	type: 'boolean',
	default: true,
	description: 'Whether to synchronize HelloAsso campaigns (forms)',
	displayOptions: {
		show: {
			resource: ['helloasso'],
			operation: ['sync'],
		},
	},
};

export const syncOrdersProperty: INodeProperties = {
	displayName: 'Sync Orders',
	name: 'syncOrders',
	type: 'boolean',
	default: true,
	description: 'Whether to synchronize HelloAsso orders',
	displayOptions: {
		show: {
			resource: ['helloasso'],
			operation: ['sync'],
		},
	},
};

export const property: INodeProperties[] = [syncFormsProperty, syncOrdersProperty];

export async function execute(
	this: IExecuteFunctions,
	cookieJar: string,
	baseUrl: string,
	itemIndex: number,
): Promise<IDataObject> {
	const baseUrlClean = baseUrl.replace(/\/$/, '');
	const syncForms = this.getNodeParameter('syncForms', itemIndex) as boolean;
	const syncOrders = this.getNodeParameter('syncOrders', itemIndex) as boolean;
	const forms = syncForms ?? true;
	const orders = syncOrders ?? true;

	// Step 1: GET sync page (n8n follows redirects automatically, cookies are maintained in the session)
	const syncPageResp = await httpFollow.call(
		this,
		'pahekoApi',
		`${baseUrlClean}/admin/p/helloasso/sync.php`,
		{
			method: 'GET',
			headers: { Cookie: cookieJar },
			timeout: 15000,
		},
	);

	const syncPageHtml = bodyToString(syncPageResp.body);
	if (!syncPageHtml) {
		throw new NodeOperationError(
			this.getNode(),
			`Empty response from sync page (status: ${syncPageResp.statusCode ?? 'unknown'})`,
		);
	}

	// Update cookie jar from set-cookie
	const cookieJarUpdated = extractCookies(syncPageResp.headers ?? {});
	if (cookieJarUpdated) {
		const parsed = parseCookies(cookieJar);
		const added = parseCookies(cookieJarUpdated);
		Object.assign(parsed, added);
		cookieJar = buildCookieJar(parsed);
	}

	const csrfMatch = syncPageHtml.match(/name="(ct_[^"]+)"\s+value="([^"]+)"/);
	const alertMatch = syncPageHtml.match(/class="alert block"([\s\S]{0,5000})<\/p>/);
	const paheko_alert = alertMatch ? alertMatch[1].trim() : null;
	if (!csrfMatch) {
		throw new NodeOperationError(
			this.getNode(),
			paheko_alert ? `${paheko_alert} — CSRF token not found` : 'CSRF token not found',
		);
	}

	const syncBody: Record<string, string> = {
		forms_present: '1',
		orders_present: '1',
		[csrfMatch[1]]: csrfMatch[2],
		sync: '1',
	};
	if (forms) syncBody.forms = '1';
	if (orders) syncBody.orders = '1';

	// Step 2: POST sync form (n8n follows redirects automatically, cookies are maintained in the session)
	const syncResp = await httpFollow.call(
		this,
		'pahekoApi',
		`${baseUrlClean}/admin/p/helloasso/sync.php`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Referer: `${baseUrlClean}/admin/p/helloasso/sync.php`,
				Cookie: cookieJar,
			},
			body: urlencode(syncBody),
			timeout: 30000,
		},
	);

	// Verify pko cookie still present
	const { cookieJar: validatedJar, valid } = updateAndValidateCookies(cookieJar, syncResp.headers);
	if (!valid) {
		throw new NodeOperationError(
			this.getNode(),
			paheko_alert
				? `${paheko_alert} — Sync failed: pko cookie lost`
				: 'Sync failed: pko cookie lost',
		);
	}
	cookieJar = validatedJar;

	return {
		success: true,
		message: 'Sync completed',
		cookies: cookieJar,
		paheko_alert,
	};
}
