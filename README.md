# RIKI Web5 Service

This project is based on [Web5Service](https://github.com/TBD54566975/incubation-tblend)

This API accepts DWN Protocol messages containing Verifiable Credentials, and transforms the request into a RIKI API request.

It then takes the RIKI API response and creates a new Verifiable Credential and responds using the DWN Protocol

## Protocol

The json-schemas directory is served over http as `/protocol`

The protocol definition itself is not currently served over http, but is in the protocol project directory.

## Running the service

```sh
npm install
npm run build
npm start
```

This starts the service on http://localhost:3001 (or the port set using the PORT environment variable)