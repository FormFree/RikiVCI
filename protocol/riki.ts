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
                        {
                            who: 'recipient',
                            of: 'createRequest',
                            can: 'read'
                        }
                    ],
                    createResponse: {
                        $actions: [
                            // TODO: Only recipient of createRequest should be able to send createResponse
                            // { 
                            //     who: 'recipient', 
                            //     of: 'createRequest', 
                            //     can: 'write'
                            // },
                            {
                                who: 'anyone',
                                can: 'write'
                            },
                            {
                                who: 'recipient',
                                of: 'createResponse',
                                can: 'read'
                            },
                        ],
                        reportRequest: {
                            $actions: [
                                // TODO: Only recipient of createResponse should be able to send reportRequest
                                // { 
                                //     who: 'recipient', 
                                //     of: 'createResponse', 
                                //     can: 'write'
                                // },
                                {
                                    who: 'anyone',
                                    can: 'write'
                                },
                                {
                                    who: 'recipient',
                                    of: 'reportRequest',
                                    can: 'read'
                                }
                            ],
                            reportResponse: {
                                $actions: [
                                    // TODO: Only recipient of reportRequest should be able to send response
                                    // { 
                                    //     who: 'recipient', 
                                    //     of: 'reportRequest', 
                                    //     can: 'write'
                                    // },
                                    {
                                        who: 'anyone',
                                        can: 'write'
                                    },
                                    {
                                        who: 'recipient',
                                        of: 'reportResponse',
                                        can: 'read'
                                    }
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
                        {
                            who: 'recipient',
                            of: 'decryptRequest',
                            can: 'read'
                        }
                    ],
                    decryptResponse: {
                        $actions: [
                            // TODO: Only recipient of decryptRequest should be able to send response
                            // { 
                            //     who: 'recipient', 
                            //     of: 'decryptRequest', 
                            //     can: 'write'
                            // },
                            {
                                who: 'anyone',
                                can: 'write'
                            },
                            {
                                who: 'recipient',
                                of: 'decryptResponse',
                                can: 'read'
                            }
                        ]
                    },
                },
            },
        },
    },
}