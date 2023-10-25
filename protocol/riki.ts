export const rikiProtocol = {
    message: {
        definition: {
            protocol: 'https://tblend.io/protocol/riki',
            published: false,
            types: {
                createRequest: {
                    schema: 'https://tblend.io/protocol/riki/create-request.schema.json',
                    dataFormats: ['application/json'],
                },
                createResponse: {
                    schema: 'https://tblend.io/protocol/riki/create-response.schema.json',
                    dataFormats: ['application/json'],
                },
                decryptRequest: {
                    schema: 'https://tblend.io/protocol/riki/decrypt-request.schema.json',
                    dataFormats: ['application/json'],
                },
                decryptResponse: {
                    schema: 'https://tblend.io/protocol/riki/decrypt-response.schema.json',
                    dataFormats: ['application/json'],
                },
                reportRequest: {
                    schema: 'https://tblend.io/protocol/riki/report-request.schema.json',
                    dataFormats: ['application/json'],
                },
                reportResponse: {
                    schema: 'https://tblend.io/protocol/riki/report-response.schema.json',
                    dataFormats: ['application/json'],
                },
            },
            structure: {
                createRequest: {
                    $actions: [
                        {
                            who: 'anyone',
                            can: 'write'
                        },
                    ],
                    createResponse: {
                        $actions: [
                            {
                                who: 'recipient',
                                of: 'createRequest',
                                can: 'write'
                            },
                        ],
                        reportRequest: {
                            $actions: [
                                {
                                    who: 'recipient',
                                    of: 'createRequest/createResponse',
                                    can: 'write'
                                },
                            ],
                            reportResponse: {
                                $actions: [
                                    {
                                        who: 'recipient',
                                        of: 'createRequest/createResponse/reportRequest',
                                        can: 'write'
                                    },
                                ]
                            },
                        },
                    },
                },
                decryptRequest: {
                    $actions: [
                        {
                            who: 'anyone',
                            can: 'write'
                        },
                    ],
                    decryptResponse: {
                        $actions: [
                            {
                                who: 'recipient',
                                of: 'decryptRequest',
                                can: 'write'
                            },
                        ]
                    },
                },
            },
        },
    },
}