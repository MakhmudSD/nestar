export enum Message {
	SOMETHING_WENT_WRONG = 'Something went wrong!',
	NO_DATA_FOUND = 'No data found!',
	CREATE_FAILED = 'Create is failed',
	UPDATE_FAILED = 'Update is failed',
	REMOVE_FAILED = 'Remove is failed',
	UPLOAD_FAILED = 'Upload is failed',
	BAD_REQUEST = 'Bad Request',

	NO_MEMBER_NICK = 'No member with that nick or phone exists',
	WRONG_PASSWORD = 'The password is invalid, please try again',
	NOT_AUTHENTICATED = 'You are not authenticated, please try again',
	BLOCKED_USER = 'You have been blocked by admins. Please contact support',
	TOKEN_NOT_EXIST = 'Bearer token is not provided',
	ONLY_SPECIFIC_ROLES_ALLOWED = 'Allowed for members with specific roles',
	NOT_ALLOWED_REQUEST = 'Not Allowed Request',
	PROVIDE_ALLOWED_FORMAT = 'Please, provide jpg, jpeg and png formats',
	SELF_SUBSCRIPTION_DENIED = 'Self subscription is denied',
}
