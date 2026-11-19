import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {verifyBridgeRequest} from '../apps-script-bridge.js';

test('bridge handshake accepts valid signed ping and rejects tampering',()=>{
 const secret='x'.repeat(48),timestamp='1795100000000',nonce='a'.repeat(32);
 const signature=createHmac('sha256',secret).update(timestamp+'\n'+nonce+'\nping').digest('hex');
 assert.equal(verifyBridgeRequest(secret,timestamp,nonce,signature,Number(timestamp)),true);
 assert.equal(verifyBridgeRequest(secret,timestamp,nonce,'0'.repeat(64),Number(timestamp)),false);
 assert.equal(verifyBridgeRequest(secret,timestamp,nonce,signature,Number(timestamp)+180000),false);
 assert.equal(verifyBridgeRequest(secret,'bad',nonce,signature,Number(timestamp)),false);
 assert.equal(verifyBridgeRequest('short',timestamp,nonce,signature,Number(timestamp)),false);
});
