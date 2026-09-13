import {
	NodeConnectionTypes,
	NodeOperationError,
	type INodeType,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeTypeDescription,
	INodeProperties,
} from 'n8n-workflow';
import { login as pahekoLogin } from './lib/login';
import {
	property as helloassoSyncProperty,
	execute as helloassoSyncExecute,
} from './actions/helloasso-sync.action';
import {
	property as orderSyncProperty,
	execute as orderSyncExecute,
} from './actions/order-sync.action';
import {
	sendMessageProperties,
	execute as sendMessageExecute,
} from './actions/send-message.action';

export class PahekoBot implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Paheko Bot',
		name: 'pahekoBot',
		icon: 'file:../../icons/paheko.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Interact with Paheko (HelloAsso, messages, orders)',
		defaults: {
			name: 'Paheko Bot',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'pahekoApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'HelloAsso', value: 'helloasso' },
					{ name: 'Member Management', value: 'memberManagement' },
				],
				default: 'helloasso',
				required: true,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Sync',
						value: 'sync',
						action: 'Sync helloasso',
						description: 'Synchronize HelloAsso forms and orders',
					},
					{
						name: 'HelloAsso Order Sync',
						value: 'orderSync',
						action: 'Sync order',
						description: 'Synchronize a specific HelloAsso order',
					},
				],
				default: 'sync',
				displayOptions: {
					show: {
						resource: ['helloasso'],
					},
				},
				required: true,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Send Message',
						value: 'sendMessage',
						action: 'Send message',
						description: 'Send a message to a user',
					},
				],
				default: 'sendMessage',
				displayOptions: {
					show: {
						resource: ['memberManagement'],
					},
				},
				required: true,
			},
			{
				displayName:
					'For this sync operation, it is recommended to enable Settings > Execute Once in the node settings to run it only once per workflow execution.',
				name: 'syncNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						resource: ['helloasso'],
						operation: ['sync'],
					},
				},
			} as INodeProperties,
			{
				displayName:
					'To send messages as the organization (sender = Organization), the bot must have admin access to member management.',
				name: 'sendMessageNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						resource: ['memberManagement'],
						operation: ['sendMessage'],
						sender: ['org'],
					},
				},
			} as INodeProperties,
			...helloassoSyncProperty,
			orderSyncProperty,
			...sendMessageProperties,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const credential = await this.getCredentials('pahekoApi');
		const baseUrl = ((credential.baseUrl ?? '') as string).replace(/\/$/, '');
		const email = credential.email as string;
		const password = credential.password as string;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const returnData: INodeExecutionData[] = [];

		// Login automatique pour récupérer les cookies
		const cookieJar = await pahekoLogin.call(this, baseUrl, email, password);

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				let result: IDataObject;

				if (resource === 'helloasso' && operation === 'sync') {
					result = await helloassoSyncExecute.call(this, cookieJar, baseUrl, itemIndex);
				} else if (resource === 'helloasso' && operation === 'orderSync') {
					result = await orderSyncExecute.call(this, cookieJar, baseUrl, itemIndex);
				} else if (resource === 'memberManagement' && operation === 'sendMessage') {
					result = await sendMessageExecute.call(this, cookieJar, baseUrl, itemIndex);
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
				}

				returnData.push({
					json: result,
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { success: false, error: JSON.parse(JSON.stringify(error)) },
						pairedItem: { item: itemIndex },
					});
				} else {
					throw new NodeOperationError(this.getNode(), error as Error, {
						itemIndex,
					});
				}
			}
		}

		return [returnData];
	}
}
