export class AuthenticationError extends Error {
  constructor(message = "로그인이 필요합니다.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message = "이 작업을 수행할 권한이 없습니다.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class ProjectNotFoundError extends AuthorizationError {
  constructor() {
    super("프로젝트에 접근할 수 없습니다.");
    this.name = "ProjectNotFoundError";
  }
}
