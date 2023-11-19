import { assert } from 'chai';
import * as express from 'express';
import * as jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import jwt_decode from 'jwt-decode';

const client = jwksRsa({
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
  jwksUri: `${process.env.AUTH0_ISSUER_BASE_URL}/.well-known/jwks.json`,
});

export async function expressAuthentication(
  request: express.Request,
  securityName: string,
  scopes: string[]
): Promise<any> {
  assert(scopes, 'Scopes must be defined and used, even though we do not yet use them.'); // Hack to get rid of TS error

  if (securityName === 'auth0') {
    if (!request.headers['authorization']) {
      throw new Error('No token provided');
    }

    const token = request.headers['authorization'].replace('Bearer ', '');

    var header: any = jwt_decode(token, { header: true });

    const key = await client.getSigningKey(header.kid).catch(async err => {
      if (err.message === 'socket hang up') return await client.getSigningKey(header.kid);
      else throw err;
    });

    const signingKey = key.getPublicKey();

    return jwt.verify(token, signingKey, function (err: any, decoded: any) {
      if (err) {
        throw err;
      } else {
        if (!decoded.aud.includes(process.env.AUTH0_AUDIENCE)) {
          throw new Error('JWT error');
        }
        if (decoded.iss != `${process.env.AUTH0_ISSUER_BASE_URL}/`) {
          throw new Error('JWT error');
        }
        return decoded;
      }
    });
  }
  throw new Error('Authentication failed.');
}
