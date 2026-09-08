/**
 * Domain Error Classes
 * Standardized hierarchy for domain and application errors
 */

export class DomainError extends Error {
	constructor(message: string, public readonly code: string = 'DOMAIN_ERROR') {
		super(message);
		this.name = this.constructor.name;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export class NotFoundError extends DomainError {
	constructor(message: string = 'Resource not found', code: string = 'NOT_FOUND') {
		super(message, code);
	}
}

export class ValidationError extends DomainError {
	constructor(
		message: string = 'Validation failed',
		public readonly details?: Record<string, unknown> | unknown[],
		code: string = 'VALIDATION_ERROR'
	) {
		super(message, code);
	}
}

export class UnauthorizedError extends DomainError {
	constructor(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED') {
		super(message, code);
	}
}

export class BadRequestError extends DomainError {
	constructor(message: string = 'Bad request', code: string = 'BAD_REQUEST') {
		super(message, code);
	}
}
