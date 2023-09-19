# RIKI VC API

This API accepts a Verifiable Presentation of Verifiable Credentials issued by Sophtron, and transforms the request into a RIKI API request.

It then takes the RIKI API response and creates a new Verifiable Credential 

## Documentation

Start the service, then view the generated API document

```sh
npm install
npm run build
npm start
```

This starts the service on http://localhost:3001 (or the port set using the PORT environment variable)

Open a browser to http://localhost:3001/api/documentation to view and test the API