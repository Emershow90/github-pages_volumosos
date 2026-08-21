declare namespace google {
  namespace accounts {
    namespace oauth2 {
      function initTokenClient(config: TokenClientConfig): TokenClient;

      interface TokenClientConfig {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: any) => void;
      }

      interface TokenClient {
        requestAccessToken(options?: { prompt?: string }): void;
        callback?: (response: TokenResponse) => void;
      }

      interface TokenResponse {
        access_token: string;
        expires_in: number;
        scope: string;
        token_type: string;
        error?: string;
      }
    }
  }
}

declare const gapi: any;
