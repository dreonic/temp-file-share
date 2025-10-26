interface UserInfo {
    sub: string;
    email?: string;
    email_verified?: boolean;
    phone_number?: string;
    phone_number_verified?: boolean;
    username?: string;
    preferred_username?: string;
    "cognito:username"?: string;
}

export default UserInfo;
