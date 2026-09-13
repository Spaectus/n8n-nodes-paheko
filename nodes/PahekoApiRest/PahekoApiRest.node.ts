import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type INodeType,
	INodeTypeDescription,
	type IExecuteFunctions,
	type INodeExecutionData,
	type IHttpRequestOptions,
} from 'n8n-workflow';

export class PahekoApiRest implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Paheko REST API',
		name: 'pahekoApiRest',
		icon: 'file:../../icons/paheko.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Paheko REST API integration',
		defaults: {
			name: 'Paheko REST API',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'pahekoApiRESTApi',
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
					{
						name: 'Accounting',
						value: 'accounting',
						description: 'Accounting years, charts, and transactions',
					},
					{ name: 'Download', value: 'downloads', description: 'Download backups' },
					{ name: 'Error', value: 'errors', description: 'Error reports and logs' },
					{ name: 'Member', value: 'members', description: 'Manage association members' },
					{ name: 'Service', value: 'services', description: 'Import subscriptions' },
					{ name: 'SQL', value: 'sql', description: 'Execute SQL SELECT queries' },
					{ name: 'Web', value: 'web', description: 'Website pages and attachments' },
				],
				default: 'sql',
				required: true,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['sql'],
					},
				},
				options: [
					{
						name: 'Execute SQL',
						value: 'execute',
						action: 'Execute SQL SELECT query',
						description: 'Run a SQL SELECT query',
					},
				],
				default: 'execute',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['downloads'],
					},
				},
				options: [
					{
						name: 'Download Database',
						value: 'downloadDatabase',
						action: 'Download database backup',
						description: 'Download the complete SQLite database backup',
					},
					{
						name: 'Download Files',
						value: 'downloadFiles',
						action: 'Download files backup',
						description: 'Download a ZIP file containing all uploaded files',
					},
				],
				default: 'downloadDatabase',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['web'],
					},
				},
				options: [
					{
						name: 'List Pages',
						value: 'list',
						action: 'List website pages',
						description: 'Return the list of website pages and categories',
					},
					{
						name: 'Get Page',
						value: 'getPage',
						action: 'Get website page details',
						description: 'Return a JSON object with all information about the given page',
					},
					{
						name: 'Get Page HTML',
						value: 'getPageHtml',
						action: 'Get website page as HTML',
						description: 'Return only the page content in HTML format',
					},
					{
						name: 'Get Attachment',
						value: 'getAttachment',
						action: 'Get page attachment',
						description: 'Return the attachment file for the given page URI and filename',
					},
				],
				default: 'list',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['members'],
					},
				},
				options: [
					{
						name: 'Create Member',
						value: 'create',
						action: 'Create a new member',
						description: 'Create a new member',
					},
					{
						name: 'Delete Member',
						value: 'delete',
						action: 'Delete a member',
						description: 'Delete a member by ID',
					},
					{
						name: 'Export Category',
						value: 'exportCategory',
						action: 'Export category members',
						description: 'Export the list of members from a category',
					},
					{
						name: 'Get Member',
						value: 'get',
						action: 'Get member details',
						description: 'Return member profile information for the given ID',
					},
					{
						name: 'Import Members',
						value: 'import',
						action: 'Import members',
						description: 'Import members from a spreadsheet file',
					},

					{
						name: 'List Categories',
						value: 'categories',
						action: 'List member categories',
						description: 'Return the list of member categories',
					},
					{
						name: 'Preview Import',
						value: 'importPreview',
						action: 'Preview member import',
						description: 'Preview what changes a member import would make',
					},

					{
						name: 'Subscribe Member',
						value: 'subscribe',
						action: 'Subscribe a member to an activity',
						description: 'Subscribe a member to an activity/service',
					},

					{
						name: 'Update Member',
						value: 'update',
						action: 'Update a member',
						description: 'Modify member profile information for the given ID',
					},
				],
				default: 'categories',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['services'],
					},
				},
				options: [
					{
						name: 'Import Subscriptions',
						value: 'importSubscriptions',
						action: 'Import subscriptions from CSV',
						description: 'Import member subscriptions to activities from a CSV file',
					},
				],
				default: 'importSubscriptions',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['errors'],
					},
				},
				options: [
					{
						name: 'Report Error',
						value: 'report',
						action: 'Report an error',
						description: 'Send an error report (AirBrake/errbit format)',
					},
					{
						name: 'Get Error Log',
						value: 'errorLog',
						action: 'Get system error log',
						description: 'Return the system error log in AirBrake/errbit format',
					},
				],
				default: 'report',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['accounting'],
					},
				},
				options: [
					{
						name: 'Clear Transaction Entries',
						value: 'clearTransactionEntries',
						action: 'Clear linked entries',
						description: 'Clear the list of entries linked to a transaction',
					},
					{
						name: 'Clear Transaction Subscriptions',
						value: 'clearTransactionSubscriptions',
						action: 'Clear linked subscriptions',
						description: 'Clear the list of subscriptions linked to a transaction',
					},

					{
						name: 'Clear Transaction Users',
						value: 'clearTransactionUsers',
						action: 'Clear linked users',
						description: 'Clear the list of member IDs linked to a transaction',
					},
					{
						name: 'Create Transaction',
						value: 'createTransaction',
						action: 'Create a transaction',
						description: 'Create a new accounting entry/transaction',
					},

					{
						name: 'Export Year',
						value: 'exportYear',
						action: 'Export accounting year',
						description: 'Export the specified year in the given format',
					},
					{
						name: 'Get Account Journal',
						value: 'accountJournal',
						action: 'Get account journal',
						description: 'Return the journal of entries for an account within a year',
					},
					{
						name: 'Get Chart Accounts',
						value: 'chartAccounts',
						action: 'List accounts for a chart',
						description: 'Return the list of accounts for the specified accounting plan',
					},

					{
						name: 'Get Transaction',
						value: 'getTransaction',
						action: 'Get transaction details',
						description: 'Return the details of the specified transaction',
					},

					{
						name: 'Get Transaction Entries',
						value: 'getTransactionEntries',
						action: 'Get linked entries',
						description: 'Return the list of entries linked to a transaction',
					},
					{
						name: 'Get Transaction Subscriptions',
						value: 'getTransactionSubscriptions',
						action: 'Get linked subscriptions',
						description: 'Return the list of subscriptions linked to a transaction',
					},

					{
						name: 'Get Transaction Users',
						value: 'getTransactionUsers',
						action: 'Get linked users',
						description: 'Return the list of member IDs linked to a transaction',
					},

					{
						name: 'Get Year Journal',
						value: 'yearJournal',
						action: 'Get year journal',
						description: 'Return the general journal of entries for the specified year',
					},

					{
						name: 'List Charts',
						value: 'charts',
						action: 'List accounting charts',
						description: 'Return the list of accounting charts',
					},

					{
						name: 'List Years',
						value: 'years',
						action: 'List accounting years',
						description: 'Return the list of accounting years',
					},

					{
						name: 'Update Transaction',
						value: 'updateTransaction',
						action: 'Update a transaction',
						description: 'Modify the specified transaction',
					},
					{
						name: 'Update Transaction Entries',
						value: 'updateTransactionEntries',
						action: 'Update linked entries',
						description: 'Update the list of entries linked to a transaction',
					},
					{
						name: 'Update Transaction Subscriptions',
						value: 'updateTransactionSubscriptions',
						action: 'Update linked subscriptions',
						description: 'Update the list of subscriptions linked to a transaction',
					},
					{
						name: 'Update Transaction Users',
						value: 'updateTransactionUsers',
						action: 'Update linked users',
						description: 'Update the list of member IDs linked to a transaction',
					},
				],
				default: 'years',
			},
			// ===== SQL =====
			{
				displayName: 'SQL Query',
				name: 'sqlQuery',
				type: 'string',
				typeOptions: { rows: 5 },
				default: 'SELECT * FROM users LIMIT 10',
				placeholder: 'SELECT * FROM users LIMIT 10',
				description: 'SQL SELECT query to execute',
				displayOptions: { show: { resource: ['sql'], operation: ['execute'] } },
			},
			{
				displayName: 'Output Format',
				name: 'sqlFormat',
				type: 'options',
				options: [
					{ name: 'JSON', value: 'json' },
					{ name: 'CSV', value: 'csv' },
					{ name: 'ODS', value: 'ods' },
					{ name: 'XLSX', value: 'xlsx' },
				],
				default: 'json',
				description: 'Output format for SQL results',
				displayOptions: { show: { resource: ['sql'], operation: ['execute'] } },
			},
			// ===== Web =====
			{
				displayName: 'Page URI',
				name: 'pageUri',
				type: 'string',
				default: '',
				description: 'URI of the web page',
				displayOptions: {
					show: { resource: ['web'], operation: ['getPage', 'getPageHtml', 'getAttachment'] },
				},
			},
			{
				displayName: 'Include HTML',
				name: 'includeHtml',
				type: 'boolean',
				default: false,
				description: 'Whether to include HTML version of the page',
				displayOptions: { show: { resource: ['web'], operation: ['getPage'] } },
			},
			{
				displayName: 'Attachment Filename',
				name: 'attachmentFilename',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['web'], operation: ['getAttachment'] } },
			},
			// ===== Members =====
			{
				displayName: 'Member ID',
				name: 'memberId',
				type: 'number',
				default: 0,
				description: 'ID of the member',
				displayOptions: {
					show: {
						resource: ['members'],
						operation: ['get', 'update', 'delete', 'subscribe', 'exportCategory'],
					},
				},
			},
			{
				displayName: 'Member Fields',
				name: 'memberFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				description: 'Member profile fields',
				displayOptions: { show: { resource: ['members'], operation: ['create', 'update'] } },
				options: [
					{
						displayName: 'Additional Fields',
						name: 'additionalFields',
						type: 'collection',
						default: {},
						options: [],
					},
					{ displayName: 'Category ID', name: 'id_category', type: 'number', default: 0 },
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
					},
					{ displayName: 'First and Last Name', name: 'nom_prenom', type: 'string', default: '' },
					{
						displayName: 'Force Duplicate',
						name: 'force_duplicate',
						type: 'boolean',
						default: false,
						description: 'Whether to not return error if member with same name exists',
					},
					{
						displayName: 'Password',
						name: 'password',
						type: 'string',
						typeOptions: { password: true },
						default: '',
					},
				],
			},
			{
				displayName: 'Subscribe Options',
				name: 'subscribeOptions',
				type: 'collection',
				default: {},
				description: 'Subscription options',
				displayOptions: { show: { resource: ['members'], operation: ['subscribe'] } },
				options: [
					{
						displayName: 'Date',
						name: 'date',
						type: 'string',
						default: '',
						description: 'Subscription date (DD/MM/YYYY)',
					},
					{
						displayName: 'Expected Amount',
						name: 'expected_amount',
						type: 'string',
						default: '',
						description: 'Expected payment amount',
					},
					{
						displayName: 'Expiry Date',
						name: 'expiry_date',
						type: 'string',
						default: '',
						description: 'Expiry date (DD/MM/YYYY)',
					},
					{
						displayName: 'Fee ID',
						name: 'id_fee',
						type: 'number',
						default: 0,
						description: 'Tariff ID',
					},
					{
						displayName: 'Paid',
						name: 'paid',
						type: 'boolean',
						default: false,
						description: 'Whether the subscription is paid',
					},
					{
						displayName: 'Service ID',
						name: 'id_service',
						type: 'number',
						default: 0,
						description: 'Activity/Service ID',
					},
				],
			},
			{
				displayName: 'Category Export Format',
				name: 'exportFormat',
				type: 'options',
				options: [
					{ name: 'JSON', value: 'json' },
					{ name: 'CSV', value: 'csv' },
					{ name: 'ODS', value: 'ods' },
					{ name: 'XLSX', value: 'xlsx' },
				],
				default: 'json',
				description: 'Export format',
				displayOptions: { show: { resource: ['members'], operation: ['exportCategory'] } },
			},
			// ===== Member Import =====
			{
				displayName: 'Import Mode',
				name: 'importMode',
				type: 'options',
				options: [
					{ name: 'Auto', value: 'auto' },
					{ name: 'Create', value: 'create' },
					{ name: 'Update', value: 'update' },
				],
				default: 'auto',
				displayOptions: { show: { resource: ['members'], operation: ['import', 'importPreview'] } },
			},
			{
				displayName: 'Skip Lines',
				name: 'skipLines',
				type: 'number',
				default: 1,
				description: 'Number of lines to skip at the top',
				displayOptions: { show: { resource: ['members'], operation: ['import', 'importPreview'] } },
			},
			{
				displayName: 'Import File',
				name: 'importFile',
				type: 'string',
				default: '',
				description: 'File path to the spreadsheet (CSV/XLSX/ODS) to import',
				displayOptions: { show: { resource: ['members'], operation: ['import', 'importPreview'] } },
			},
			{
				displayName: 'Additional Import Params',
				name: 'importParams',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Column Mapping',
						name: 'columnMapping',
						type: 'string',
						default: '',
						placeholder: 'column[0]=nom&column[1]=prenom',
						description: 'Column mapping (e.g. column[0]=nom&column[1]=prenom)',
					},
				],
				displayOptions: { show: { resource: ['members'], operation: ['import', 'importPreview'] } },
			},
			// ===== Services Import =====
			{
				displayName: 'Subscriptions Import Mode',
				name: 'subsImportMode',
				type: 'options',
				options: [
					{ name: 'Auto', value: 'auto' },
					{ name: 'Create', value: 'create' },
					{ name: 'Update', value: 'update' },
				],
				default: 'auto',
				displayOptions: { show: { resource: ['services'], operation: ['importSubscriptions'] } },
			},
			{
				displayName: 'Subscriptions File',
				name: 'subsImportFile',
				type: 'string',
				default: '',
				description: 'File path to the CSV file',
				displayOptions: { show: { resource: ['services'], operation: ['importSubscriptions'] } },
			},
			// ===== Errors =====
			{
				displayName: 'Error Data',
				name: 'errorData',
				type: 'json',
				default: '{}',
				description: 'Error report data (AirBrake/errbit format)',
				displayOptions: { show: { resource: ['errors'], operation: ['report'] } },
			},
			// ===== Accounting =====
			{
				displayName: 'Accounting Year',
				name: 'accountId',
				type: 'number',
				default: 0,
				description: 'Fiscal year ID (use "current" expression for current year)',
				displayOptions: {
					show: {
						resource: ['accounting'],
						operation: ['yearJournal', 'accountJournal', 'exportYear'],
					},
				},
			},
			{
				displayName: 'Chart ID',
				name: 'chartId',
				type: 'number',
				default: 0,
				description: 'Chart of accounts ID',
				displayOptions: { show: { resource: ['accounting'], operation: ['chartAccounts'] } },
			},
			{
				displayName: 'Account Code',
				name: 'accountCode',
				type: 'string',
				default: '',
				description: 'Account code (e.g. 512A)',
				displayOptions: { show: { resource: ['accounting'], operation: ['accountJournal'] } },
			},
			{
				displayName: 'Export Format',
				name: 'exportFormat',
				type: 'options',
				options: [
					{ name: 'Full', value: 'full' },
					{ name: 'Grouped', value: 'grouped' },
					{ name: 'Simple', value: 'simple' },
					{ name: 'Fec', value: 'fec' },
				],
				default: 'full',
				displayOptions: { show: { resource: ['accounting'], operation: ['exportYear'] } },
			},
			{
				displayName: 'Export Extension',
				name: 'exportExtension',
				type: 'options',
				options: [
					{ name: 'CSV', value: 'csv' },
					{ name: 'ODS', value: 'ods' },
					{ name: 'XLSX', value: 'xlsx' },
					{ name: 'JSON', value: 'json' },
				],
				default: 'csv',
				displayOptions: { show: { resource: ['accounting'], operation: ['exportYear'] } },
			},
			{
				displayName: 'Transaction ID',
				name: 'transactionId',
				type: 'number',
				default: 0,
				description: 'Journal entry ID',
				displayOptions: {
					show: {
						resource: ['accounting'],
						operation: [
							'getTransaction',
							'updateTransaction',
							'getTransactionUsers',
							'updateTransactionUsers',
							'clearTransactionUsers',
							'getTransactionEntries',
							'updateTransactionEntries',
							'clearTransactionEntries',
							'getTransactionSubscriptions',
							'updateTransactionSubscriptions',
							'clearTransactionSubscriptions',
						],
					},
				},
			},
			{
				displayName: 'Transaction Fields',
				name: 'transactionFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: { resource: ['accounting'], operation: ['createTransaction', 'updateTransaction'] },
				},
				options: [
					{
						displayName: 'Additional Fields',
						name: 'additionalFields',
						type: 'collection',
						default: {},
						options: [],
					},
					{
						displayName: 'Amount',
						name: 'amount',
						type: 'number',
						default: 0,
						description: 'Amount (simplified entries only)',
					},
					{
						displayName: 'Credit Account',
						name: 'credit',
						type: 'string',
						default: '',
						description: 'Credit account number (simplified entries only)',
					},

					{
						displayName: 'Date',
						name: 'date',
						type: 'string',
						default: '',
						description: 'Entry date in YYYY-MM-DD format',
					},

					{
						displayName: 'Debit Account',
						name: 'debit',
						type: 'string',
						default: '',
						description: 'Debit account number (simplified entries only)',
					},
					{ displayName: 'Document Reference', name: 'reference', type: 'string', default: '' },
					{
						displayName: 'Entry Lines',
						name: 'lines',
						type: 'json',
						default: '[\n  {}\n]',
						description: 'Entry lines (multi-line/advanced entries only)',
					},
					{
						displayName: 'Entry Type',
						name: 'type',
						type: 'options',
						default: 'EXPENSE',
						options: [
							{ name: 'ADVANCED', value: 'ADVANCED' },
							{ name: 'CREDIT', value: 'CREDIT' },
							{ name: 'DEBT', value: 'DEBT' },
							{ name: 'EXPENSE', value: 'EXPENSE' },
							{ name: 'REVENUE', value: 'REVENUE' },
							{ name: 'TRANSFER', value: 'TRANSFER' },
						],
						description: 'Simplified entry type',
					},
					{ displayName: 'Label', name: 'label', type: 'string', default: '' },
					{ displayName: 'Notes', name: 'notes', type: 'string', default: '' },
					{
						displayName: 'Payment Reference',
						name: 'payment_reference',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Project ID',
						name: 'id_project',
						type: 'number',
						default: 0,
						description: 'Project ID (simplified entries only)',
					},
				],
			},
			{
				displayName: 'Users List',
				name: 'usersList',
				type: 'json',
				default: '[]',
				description: 'Array of user IDs',
				displayOptions: {
					show: { resource: ['accounting'], operation: ['updateTransactionUsers'] },
				},
			},
			{
				displayName: 'Entries List',
				name: 'entriesList',
				type: 'json',
				default: '[]',
				description: 'Array of transaction IDs',
				displayOptions: {
					show: { resource: ['accounting'], operation: ['updateTransactionEntries'] },
				},
			},
			{
				displayName: 'Subscriptions List',
				name: 'subscriptionsList',
				type: 'json',
				default: '[]',
				description: 'Array of subscription IDs',
				displayOptions: {
					show: { resource: ['accounting'], operation: ['updateTransactionSubscriptions'] },
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const credentials = (await this.getCredentials('pahekoApiRESTApi')) as IDataObject;
		const baseUrl = ((credentials.baseUrl as string) || '').replace(/\/$/, '');

		for (let i = 0; i < items.length; i++) {
					try {
						const callApi = (opts: IHttpRequestOptions): Promise<IDataObject> =>
							this.helpers.httpRequestWithAuthentication.call(this, 'pahekoApiRESTApi', {
								...opts,
								url: `${baseUrl}${opts.url}`,
							});

						let responseData: IDataObject = {};

				if (resource === 'sql') {
					if (operation === 'execute') {
						const sqlQuery = this.getNodeParameter('sqlQuery', i) as string;
						const sqlFormat = this.getNodeParameter('sqlFormat', i) as string;
						const options: IHttpRequestOptions = {
							method: 'POST',
							url: `${baseUrl}/api/sql`,
							body: { sql: sqlQuery, format: sqlFormat },
							json: true,
						};
						responseData = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'pahekoApiRESTApi',
							options,
						);
					}
				}

				if (resource === 'downloads') {
					if (operation === 'downloadDatabase') {
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: `/api/download`,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'downloadFiles') {
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: `/api/download/files`,
							json: true,
						};
						responseData = await callApi(options);
					}
				}

				if (resource === 'web') {
					if (operation === 'list') {
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: `/api/web/list`,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'getPage') {
						const pageUri = this.getNodeParameter('pageUri', i) as string;
						const includeHtml = this.getNodeParameter('includeHtml', i) as boolean;
						let url = `/api/web/page/${encodeURIComponent(pageUri)}`;
						if (includeHtml) {
							url += '?html=1';
						}
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: url,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'getPageHtml') {
						const pageUri = this.getNodeParameter('pageUri', i) as string;
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: `/api/web/html/${encodeURIComponent(pageUri)}`,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'getAttachment') {
						const pageUri = this.getNodeParameter('pageUri', i) as string;
						const attachmentFilename = this.getNodeParameter('attachmentFilename', i) as string;
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: `/api/web/attachment/${encodeURIComponent(pageUri)}/${encodeURIComponent(attachmentFilename)}`,
							json: true,
						};
						responseData = await callApi(options);
					}
				}

				if (resource === 'members') {
					if (operation === 'categories') {
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: `/api/user/categories`,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'get') {
						const memberId = this.getNodeParameter('memberId', i) as number;
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: `/api/user/${memberId}`,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'create') {
						const memberFields = this.getNodeParameter('memberFields', i) as IDataObject;
						const data: IDataObject = {
							nom_prenom: memberFields.nom_prenom || '',
							email: memberFields.email || '',
							password: memberFields.password || '',
							id_category: memberFields.id_category || 0,
						};
						if (memberFields.force_duplicate) {
							data.force_duplicate = 1;
						}
						if (memberFields.additionalFields) {
							Object.assign(data, memberFields.additionalFields);
						}
						const options: IHttpRequestOptions = {
							method: 'POST',
							url: `/api/user/new`,
							body: data,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'update') {
						const memberFields = this.getNodeParameter('memberFields', i) as IDataObject;
						const data: IDataObject = {
							nom_prenom: memberFields.nom_prenom || '',
							email: memberFields.email || '',
							password: memberFields.password || '',
							id_category: memberFields.id_category || 0,
						};
						if (memberFields.force_duplicate) {
							data.force_duplicate = 1;
						}
						if (memberFields.additionalFields) {
							Object.assign(data, memberFields.additionalFields);
						}
						const options: IHttpRequestOptions = {
							method: 'POST',
							url: `/api/user/${this.getNodeParameter('memberId', i)}`,
							body: data,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'delete') {
						const options: IHttpRequestOptions = {
							method: 'DELETE',
							url: `/api/user/${this.getNodeParameter('memberId', i)}`,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'subscribe') {
						const opts = this.getNodeParameter('subscribeOptions', i) as IDataObject;
						const data: IDataObject = {
							id_service: this.getNodeParameter('memberId', i) as number,
						};
						if (opts.id_service) data.id_service = opts.id_service;
						if (opts.id_fee) data.id_fee = opts.id_fee;
						if (opts.paid !== undefined) data.paid = opts.paid;
						if (opts.date) data.date = opts.date;
						if (opts.expiry_date) data.expiry_date = opts.expiry_date;
						if (opts.expected_amount) data.expected_amount = opts.expected_amount;
						const options: IHttpRequestOptions = {
							method: 'POST',
							url: `/api/user/${this.getNodeParameter('memberId', i)}/subscribe`,
							body: data,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'importPreview') {
						const formData: Record<string, string | number> = {};
						formData.mode = this.getNodeParameter('importMode', i) as string;
						formData.skip_lines = this.getNodeParameter('skipLines', i) as number;
						const importParams = this.getNodeParameter('importParams', i, {}) as IDataObject;
						if (typeof importParams.columnMapping === 'string') {
							importParams.columnMapping.split('&').forEach((pair: string) => {
								const [key, val] = pair.split('=');
								if (key && val) formData[key] = val;
							});
						}
						const options: IHttpRequestOptions = {
							method: 'POST',
							url: `/api/user/import/preview`,
							body: formData,
							headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
							json: false,
						};
						responseData = await callApi(options);
					}
					if (operation === 'import') {
						const formData: Record<string, string | number> = {};
						formData.mode = this.getNodeParameter('importMode', i) as string;
						formData.skip_lines = this.getNodeParameter('skipLines', i) as number;
						const importParams = this.getNodeParameter('importParams', i, {}) as IDataObject;
						if (typeof importParams.columnMapping === 'string') {
							importParams.columnMapping.split('&').forEach((pair: string) => {
								const [key, val] = pair.split('=');
								if (key && val) formData[key] = val;
							});
						}
						const options: IHttpRequestOptions = {
							method: 'POST',
							url: `/api/user/import`,
							body: formData,
							headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
							json: false,
						};
						responseData = await callApi(options);
					}
					if (operation === 'exportCategory') {
						const memberId = this.getNodeParameter('memberId', i) as number;
						const exportFormat = this.getNodeParameter('exportFormat', i) as string;
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: `/api/user/category/${memberId}.${exportFormat}`,
							json: true,
						};
						responseData = await callApi(options);
					}
				}

				if (resource === 'services') {
					if (operation === 'importSubscriptions') {
						const formData: Record<string, string> = {};
						formData.mode = this.getNodeParameter('subsImportMode', i) as string;
						const options: IHttpRequestOptions = {
							method: 'PUT',
							url: `/api/services/subscriptions/import`,
							body: formData,
							headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
							json: false,
						};
						responseData = await callApi(options);
					}
				}

				if (resource === 'errors') {
					if (operation === 'report') {
						const errorData = this.getNodeParameter('errorData', i) as IDataObject;
						const options: IHttpRequestOptions = {
							method: 'POST',
							url: `/api/errors/report`,
							body: errorData,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'errorLog') {
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: `/api/errors/log`,
							json: true,
						};
						responseData = await callApi(options);
					}
				}

				if (resource === 'accounting') {
					if (operation === 'years') {
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: `/api/accounting/years`,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'charts') {
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: `/api/accounting/charts`,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'chartAccounts') {
						const chartId = this.getNodeParameter('chartId', i) as number;
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: `/api/accounting/charts/${chartId}/accounts`,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'yearJournal') {
						const accountId = this.getNodeParameter('accountId', i) as number;
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: `/api/accounting/years/${accountId}/journal`,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'exportYear') {
						const accountId = this.getNodeParameter('accountId', i) as number;
						const format = this.getNodeParameter('exportFormat', i) as string;
						const extension = this.getNodeParameter('exportExtension', i) as string;
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: `/api/accounting/years/${accountId}/export/${format}.${extension}`,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'accountJournal') {
						const accountId = this.getNodeParameter('accountId', i) as number;
						const accountCode = this.getNodeParameter('accountCode', i) as string;
						let url = `/api/accounting/years/${accountId}/account/journal`;
						if (accountCode) {
							url += `?code=${encodeURIComponent(accountCode)}`;
						}
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: url,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'createTransaction') {
						const txFields = this.getNodeParameter('transactionFields', i) as IDataObject;
						const data: IDataObject = {};
						if (txFields.id_year) data.id_year = txFields.id_year;
						if (txFields.label) data.label = txFields.label;
						if (txFields.date) data.date = txFields.date;
						if (txFields.type) data.type = txFields.type;
						if (txFields.amount) data.amount = txFields.amount;
						if (txFields.credit) data.credit = txFields.credit;
						if (txFields.debit) data.debit = txFields.debit;
						if (txFields.lines) data.lines = txFields.lines;
						if (txFields.reference) data.reference = txFields.reference;
						if (txFields.notes) data.notes = txFields.notes;
						if (txFields.id_project) data.id_project = txFields.id_project;
						if (txFields.payment_reference) data.payment_reference = txFields.payment_reference;
						if (txFields.additionalFields) {
							Object.assign(data, txFields.additionalFields);
						}
						const options: IHttpRequestOptions = {
							method: 'POST',
							url: `/api/accounting/transaction`,
							body: data,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'getTransaction') {
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: `/api/accounting/transaction/${this.getNodeParameter('transactionId', i)}`,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'updateTransaction') {
						const txFields = this.getNodeParameter('transactionFields', i) as IDataObject;
						const data: IDataObject = {};
						if (txFields.id_year) data.id_year = txFields.id_year;
						if (txFields.label) data.label = txFields.label;
						if (txFields.date) data.date = txFields.date;
						if (txFields.type) data.type = txFields.type;
						if (txFields.amount) data.amount = txFields.amount;
						if (txFields.credit) data.credit = txFields.credit;
						if (txFields.debit) data.debit = txFields.debit;
						if (txFields.lines) data.lines = txFields.lines;
						if (txFields.reference) data.reference = txFields.reference;
						if (txFields.notes) data.notes = txFields.notes;
						if (txFields.id_project) data.id_project = txFields.id_project;
						if (txFields.payment_reference) data.payment_reference = txFields.payment_reference;
						if (txFields.additionalFields) {
							Object.assign(data, txFields.additionalFields);
						}
						const options: IHttpRequestOptions = {
							method: 'POST',
							url: `/api/accounting/transaction/${this.getNodeParameter('transactionId', i)}`,
							body: data,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'getTransactionUsers') {
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: `/api/accounting/transaction/${this.getNodeParameter('transactionId', i)}/users`,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'updateTransactionUsers') {
						const usersList = this.getNodeParameter('usersList', i) as IDataObject;
						const options: IHttpRequestOptions = {
							method: 'POST',
							url: `/api/accounting/transaction/${this.getNodeParameter('transactionId', i)}/users`,
							body: { users: usersList },
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'clearTransactionUsers') {
						const options: IHttpRequestOptions = {
							method: 'DELETE',
							url: `/api/accounting/transaction/${this.getNodeParameter('transactionId', i)}/users`,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'getTransactionEntries') {
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: `/api/accounting/transaction/${this.getNodeParameter('transactionId', i)}/transactions`,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'updateTransactionEntries') {
						const entriesList = this.getNodeParameter('entriesList', i) as IDataObject;
						const options: IHttpRequestOptions = {
							method: 'POST',
							url: `/api/accounting/transaction/${this.getNodeParameter('transactionId', i)}/transactions`,
							body: { transactions: entriesList },
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'clearTransactionEntries') {
						const options: IHttpRequestOptions = {
							method: 'DELETE',
							url: `/api/accounting/transaction/${this.getNodeParameter('transactionId', i)}/transactions`,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'getTransactionSubscriptions') {
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: `/api/accounting/transaction/${this.getNodeParameter('transactionId', i)}/subscriptions`,
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'updateTransactionSubscriptions') {
						const subscriptionsList = this.getNodeParameter('subscriptionsList', i) as IDataObject;
						const options: IHttpRequestOptions = {
							method: 'POST',
							url: `/api/accounting/transaction/${this.getNodeParameter('transactionId', i)}/subscriptions`,
							body: { subscriptions: subscriptionsList },
							json: true,
						};
						responseData = await callApi(options);
					}
					if (operation === 'clearTransactionSubscriptions') {
						const options: IHttpRequestOptions = {
							method: 'DELETE',
							url: `/api/accounting/transaction/${this.getNodeParameter('transactionId', i)}/subscriptions`,
							json: true,
						};
						responseData = await callApi(options);
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, {
					itemIndex: i,
				});
			}
		}
		return [returnData];
	}
}
