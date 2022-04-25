// This is foundational common code for the RPC framework. It is used in all contexts of a web extension: background scripts,
// popup scripts, content scripts, and the web page.

export {RpcServer, RpcClient}

/**
 * This is a partially implemented class (in Java it would be called an "abstract" class) that defines the base
 * functionality of the server component of a Remote Procedure Call (RPC) system. Instances of this class service RPC
 * requests initiated by RPC clients.
 *
 * The unimplemented method "listen()" must be implemented by the concrete sub-classes.
 */
abstract class RpcServer {

    #promiseProcedures = new Map()
    #callbackProcedures = new Map()
    readonly #descriptor

    /**
     * @param descriptor The descriptor describes this particular RPC server. Specifically, the descriptor should be either
     * of: "background", "content-script", or "web-page". It's possible that this range will be expanded in the future
     * but for now that's it.
     */
    protected constructor(descriptor) {
        if (!descriptor) {
            throw new Error(`Expected a truthy value for 'descriptor' but found ${descriptor}`)
        }

        this.#descriptor = descriptor
    }

    /**
     * Sub-classes must implement this method to register the necessary "listener" to listen for remote procedure
     * requests. The listener must invoke the "intake" method to determine if the message is indeed an RPC request
     * intended for this server or not. If it is, then this function must invoke "dispatch" and then send the return
     * value of the procedure to the client.
     */
    listen() {
    }


    /**
     * Should this request be processed or not? In some cases, a message will be intended for a different RPC receiver,
     * or the message is not even an RPC message at all. The "intake" function logs the message and determines if it
     * should be processed as a remote procedure call by the server.
     *
     * @param message
     * @return {boolean} true if the request should be handled by the server or false if not.
     */
    intake(message) : boolean {
        console.debug(`[RpcServer|${this.#descriptor}] Received message:`)
        console.debug(JSON.stringify({message}, null, 2))

        return this.#descriptor === message.procedureTargetReceiver;
    }

    /**
     * Dispatches the RPC request.
     * @param rpcRequest
     * @return {Promise} a promise that resolves with the return value of the procedure
     */
    dispatch({procedureName, procedureArgs}) {
        console.debug(`[RpcServer|${this.#descriptor}] Dispatching RPC call for '${procedureName}'...`)

        if (this.#promiseProcedures.has(procedureName)) {
            const procedure = this.#promiseProcedures.get(procedureName)
            return procedure(procedureArgs)
        } else if (this.#callbackProcedures.has(procedureName)) {
            const procedure = this.#callbackProcedures.get(procedureName)
            return new Promise(resolve => {
                procedure(procedureArgs, resolve)
            })
        } else {
            throw new Error(`[RpcServer] This RPC request can't be executed. No procedure was registered with the name '${procedureName}'`)
        }
    }

    /**
     * Register a promise-returning procedure function that will handle RPC requests from the client for the given procedure name.
     *
     * When the server receives a request, it will take the procedure name from the request to look up a registered
     * procedure of the same name. If found, the procedure will be invoked with the "procedureArgs" contained in the
     * request and it will send the response to the client.
     *
     * @param procedureName the name of the procedure. All RPC request will include a procedure name so that the correct
     * procedure can be found by its name
     * @param procedure the procedure to execute on the server. It must take zero or one args. The first argument must
     * be the "procedureArgs". The procedure must return a Promise. The Promise should resolve with the return value of
     * interest when the procedure is finished its work.
     */
    registerPromiseProcedure <T,R> (procedureName, procedure : (procedureArgs: R) => Promise<T>) {
        this.#promiseProcedures.set(procedureName, procedure)
    }

    /**
     * Like 'registerPromiseProcedure' but for a callback-based procedure. The callback-based procedure is not expected
     * to a return a promise. Instead it finishes by calling a "resolve" function. A "resolve" function will be passed
     * as a second argument.
     */
    registerCallbackProcedure(procedureName, procedure) {
        this.#callbackProcedures.set(procedureName, procedure)
    }
}

/**
 * This is an interface class that defines the API for a Remote Procedure Call (RPC) client which makes RPC requests to
 * a receiving RPC server. For example, an RPC client on the web page may make an RPC request to an RPC server running
 * in a background script.
 */
abstract class RpcClient {

    readonly #procedureTargetReceiver

    /**
     * @param procedureTargetReceiver the destination RPC server for RPC requests. This is needed to make sure the right RPC
     * server finds the request and all other RPC servers ignore it.
     */
    protected constructor(procedureTargetReceiver) {
        if (!procedureTargetReceiver) {
            throw new Error(`Expected a truthy value for 'procedureTargetReceiver' but found ${procedureTargetReceiver}`)
        }

        this.#procedureTargetReceiver = procedureTargetReceiver
    }

    /**
     * Create an RPC request object with the configured "target receiver".
     *
     * Note: This is a "protected" method and should only be called by sub-classes.
     *
     * @return {Object} a correctly formatted RPC request message
     */
    createRequest<T>(procedureName, procedureArgs): RpcRequestMessage<T> {
        return {
            procedureTargetReceiver: this.#procedureTargetReceiver,
            procedureName,
            procedureArgs,
            procedureCaptureReturnValue: false
        }
    }

    /**
     * Execute a remote procedure call by sending a message to a receiving RPC server and waiting for the response.
     *
     * In implementations of this method, make sure to call the "createRequest" function to create the RPC request object
     * before sending the request to the RPC server.
     *
     * @param procedureName the "procedure name" of the remote procedure call.
     * @param procedureArgs the "procedure arguments" of the remote procedure call.
     * @return {Promise} a promise containing the return value of the remote procedure call
     */
    abstract execRemoteProcedure<T,R>(procedureName, procedureArgs: T): Promise<R>
}

interface RpcRequestMessage<T> {
    procedureTargetReceiver: string
    procedureName: string
    procedureArgs: T
    procedureCaptureReturnValue: boolean
}
