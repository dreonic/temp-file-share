// export const cognitoConfig = {
//     userPoolId: "ap-southeast-1_1wixcmwPk",
//     clientId: "4sceenhv8q25janbjc6dpjeclb",
//     domain: "ap-southeast-11wixcmwpk.auth.ap-southeast-1.amazoncognito.com",
//     redirectUri: "http://localhost:3000/",
//     logoutUri: "http://localhost:3000/logout",
//     scope: "email openid phone",
// };

export type CognitoConfig = {
    userPoolId: string;
    clientId: string;
    domain: string;
    redirectUri: string;
    logoutUri: string;
    scope: string;
};

export const cognitoConfig: CognitoConfig = {
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "",
    clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "",
    domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "",
    redirectUri:
        process.env.NEXT_PUBLIC_REDIRECT_URI || "http://localhost:3000/",
    logoutUri:
        process.env.NEXT_PUBLIC_LOGOUT_URI || "http://localhost:3000/logout",
    scope: process.env.NEXT_PUBLIC_COGNITO_SCOPE || "email openid profile",
};

// Generate random state for CSRF protection
function generateState(): string {
    return (
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15)
    );
}

export const getLoginUrl = (): string => {
    const state = generateState();

    // Store state in localStorage for verification
    if (typeof window !== "undefined") {
        localStorage.setItem("cognito_state", state);
    }

    const params = new URLSearchParams({
        client_id: cognitoConfig.clientId,
        response_type: "code",
        scope: cognitoConfig.scope,
        redirect_uri: cognitoConfig.redirectUri,
        state: state,
    });

    return `https://${cognitoConfig.domain}/login?${params.toString()}`;
};

export const getLogoutUrl = (): string => {
    const params = new URLSearchParams({
        client_id: cognitoConfig.clientId,
        logout_uri: cognitoConfig.logoutUri,
    });

    return `https://${cognitoConfig.domain}/logout?${params.toString()}`;
};
