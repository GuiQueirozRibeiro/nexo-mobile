/**
 * Exceções da camada de DataSource (inspiradas em core/lib/src/errors/server_exception.dart do App_Nasa).
 * São capturadas exclusivamente nos Repositories e convertidas em Either<Failure, T>.
 */

export class ServerException extends Error {
  public readonly statusCode: number;
  public readonly endpoint?: string;

  public constructor(
    message: string,
    statusCode = 500,
    endpoint?: string,
  ) {
    super(message);
    this.name = 'ServerException';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
  }
}

export class CacheException extends Error {
  public readonly storageKey: string;

  public constructor(message: string, storageKey: string) {
    super(message);
    this.name = 'CacheException';
    this.storageKey = storageKey;
  }
}
