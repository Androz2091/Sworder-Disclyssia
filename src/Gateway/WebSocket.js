'use strict'

const WS = require('ws')
const { EventEmitter } = require('events')
const ZlibSync = require('zlib-sync')
const Endpoints = require('./Endpoints')
const Constants = require('../Constants')
const Payloads = require('./Payloads')

module.exports = class WebSocket extends EventEmitter {
    constructor (client) {
        super()
        this._client = client
        this._ws = null
        this._seq = null

        this.isReady = false
        this.isDisconnected = false

        this.lastHeartbeatSentAt = null
        this.lastHeartbeatAckReceivedAt = null
    }

    get ping () {
        return this.lastHeartbeatAckReceivedAt - this.lastHeartbeatSentAt
    }

    /**
     * Connects the client to the Discord Gateway
     * @param token
     */
    connect (token, intents) {
        this._ws = new WS(Endpoints.GATEWAY + '/?v=' + Constants.GATEWAY_VERSION + '&encoding=json')
        this._ws.once('open', () => {
            this._WSConnect(Payloads.IDENTIFY({ token, intents }))
        })
        this._ws.once('close', this._handleWSClose.bind(this))
        this._ws.once('error', this._handleWSError.bind(this))
        this._ws.on('message', this._handleWSMessage.bind(this))
    }

    /**
     * Disconnects the client from the Discord Gateway
     */
    disconnect () {
        this.isDisconnected = true
        this._ws.terminate()
    }

    /**
     * Sends payload to the Discord gateway
     * @param payload
     */
    WSSend (payload) {
        if (typeof payload === 'string') {
            payload = JSON.parse(payload)
        }
        this._ws.send(JSON.stringify(payload))
    }

    _WSConnect (payload) {
        if (this._ws !== null && this._ws.readyState !== this._ws.CLOSED) {
            this.WSSend(payload)
        }
    }

    _sendHeartbeat () {
        this.WSSend({
            op: 1,
            d: this._seq
        })
        this.lastHeartbeatSentAt = Date.now()
    }

    _handleWSMessage (data, flags) {
        const message = this._decompressWSMessage(data, flags)
        switch (message.op) {
        case 10:
            this._sendHeartbeat()
            setInterval(() => this._sendHeartbeat, message.d.heartbeat_interval)
            break
        case 11:
            this.lastHeartbeatAckReceivedAt = Date.now()
            break
        case 0: {
            this._seq = message.s
            switch (message.t) {
            case 'READY':
                if (!this.isReady) {
                    this.emit('ready', message.d.user)
                    this.isReady = true
                }
                break
            case 'MESSAGE_CREATE':
                this.emit('message', message.d)
                break
            }
        }
        }
    }

    _handleWSError (error) {
        if (this._ws !== null) {
            if (error) {
                throw error
            }
        }
    }

    _handleWSClose (code, data) {
        if (this._ws !== null && !this.isDisconnected) {
            setTimeout(() => this.connect(this._client.token), 1000)
        }
    }

    _decompressWSMessage (message, flags) {
        if (typeof flags !== 'object') { flags = {} }
        if (!flags.binary) {
            return JSON.parse(message)
        } else {
            const inflate = new ZlibSync.Inflate()
            inflate.push(message, ZlibSync.Z_SYNC_FLUSH)

            if (inflate.err < 0) {
                throw new Error('An error has occured with Zlib: ' + inflate.msg)
            }
            return JSON.parse(inflate.toString())
        }
    }
}
