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

const senderProperty: INodeProperties = {
	displayName: 'Sender',
	name: 'sender',
	type: 'options',
	options: [
		{ name: 'Organization', value: 'org', description: 'Send from the organization' },
		{ name: 'Myself', value: 'self', description: "The bot's own email address" },
	],
	default: 'org',
	description: 'Who is sending the message',
	displayOptions: {
		show: {
			resource: ['memberManagement'],
			operation: ['sendMessage'],
		},
	},
};

const userIdProperty: INodeProperties = {
	displayName: 'User ID',
	name: 'userId',
	type: 'string',
	required: true,
	default: '',
	placeholder: '',
	description: 'ID of the message recipient user',
	displayOptions: {
		show: {
			resource: ['memberManagement'],
			operation: ['sendMessage'],
		},
	},
};

const subjectProperty: INodeProperties = {
	displayName: 'Subject',
	name: 'subject',
	type: 'string',
	required: true,
	default: '',
	placeholder: '',
	description: 'Subject of the message',
	displayOptions: {
		show: {
			resource: ['memberManagement'],
			operation: ['sendMessage'],
		},
	},
};

const messageProperty: INodeProperties = {
	displayName: 'Message',
	name: 'message',
	type: 'string',
	typeOptions: {
		rows: 4,
	},
	required: true,
	default: '',
	placeholder: '',
	description: 'Body of the message',
	displayOptions: {
		show: {
			resource: ['memberManagement'],
			operation: ['sendMessage'],
		},
	},
};

const sendCopyProperty: INodeProperties = {
	displayName: 'Send Copy to Bot',
	name: 'sendCopy',
	type: 'boolean',
	default: false,
	description: "Whether to send a copy of the message to the bot's email address",
	displayOptions: {
		show: {
			resource: ['memberManagement'],
			operation: ['sendMessage'],
		},
	},
};

export const sendMessageProperties: INodeProperties[] = [
	senderProperty,
	userIdProperty,
	subjectProperty,
	messageProperty,
	sendCopyProperty,
];

export async function execute(
	this: IExecuteFunctions,
	cookieJar: string,
	baseUrl: string,
	itemIndex: number,
): Promise<IDataObject> {
	const baseUrlClean = baseUrl.replace(/\/$/, '');
	const userId = this.getNodeParameter('userId', itemIndex) as string;
	const sender = this.getNodeParameter('sender', itemIndex) as string;
	const subject = this.getNodeParameter('subject', itemIndex) as string;
	const messageText = this.getNodeParameter('message', itemIndex) as string;
	const sendCopy = this.getNodeParameter('sendCopy', itemIndex) as boolean;

	if (!userId) throw new NodeOperationError(this.getNode(), 'User ID is required');
	if (!subject) throw new NodeOperationError(this.getNode(), 'Subject is required');
	if (!messageText) throw new NodeOperationError(this.getNode(), 'Message is required');

	const url = `${baseUrlClean}/admin/users/message.php?id=${userId}`;

	// GET message page
	const messagePageResp = await httpFollow.call(this, 'pahekoApi', url, {
		method: 'GET',
		headers: { Cookie: cookieJar },
		timeout: 15000,
	});

	const cookieJarUpdated = extractCookies(messagePageResp.headers ?? {});
	if (cookieJarUpdated) {
		const parsed = parseCookies(cookieJar);
		const added = parseCookies(cookieJarUpdated);
		Object.assign(parsed, added);
		cookieJar = buildCookieJar(parsed);
	}

	const messagePageHtml = bodyToString(messagePageResp.body);
	if (!messagePageHtml) {
		throw new NodeOperationError(
			this.getNode(),
			`Empty response from message page (status: ${messagePageResp.statusCode ?? 'unknown'})`,
		);
	}

	const csrfMatch = messagePageHtml.match(/name="(ct_[^"]+)"\s+value="([^"]+)"/);
	if (!csrfMatch) {
		throw new NodeOperationError(this.getNode(), 'CSRF token not found');
	}

	const postData: Record<string, string> = {
		sender,
		subject,
		message: messageText,
		send_copy_present: '1',
		[csrfMatch[1]]: csrfMatch[2],
		send: '1',
	};
	if (sendCopy) postData.send_copy = '1';

	// POST
	const sendResp = await httpFollow.call(this, 'pahekoApi', url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Referer: url,
			Cookie: cookieJar,
		},
		body: urlencode(postData),
		timeout: 30000,
	});

	const resultHtml = bodyToString(sendResp.body);
	const errorMatch = resultHtml.match(/class="block error"([\s\S]{0,5000})<\/(?:div|p)>/);
	if (errorMatch) {
		return { success: false, paheko_error: errorMatch[1].trim() };
	}

	const { valid } = updateAndValidateCookies(cookieJar, sendResp.headers);
	if (!valid) {
		throw new NodeOperationError(this.getNode(), 'Session invalid after send');
	}

	const messageBlock = resultHtml.match(/class="block ([\s\S]{0,5000})<\/(?:div|p)>/);
	if (messageBlock) {
		return { success: true, message: messageBlock[1].trim(), paheko_error: null, userId };
	}

	return { success: true, message: '', paheko_error: null, userId };
}
