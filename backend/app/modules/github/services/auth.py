from github import Github, GithubIntegration

from app.core.config import settings


def get_github_integration() -> GithubIntegration:
    app_id_str = settings.github_app_id
    if not app_id_str:
        raise ValueError("GITHUB_APP_ID environment variable is not set")

    app_id = int(app_id_str)
    private_key = settings.github_private_key

    if not private_key:
        raise ValueError("GITHUB_PRIVATE_KEY environment variable is not set")

    # Handle potentially escaped newlines if stored as a single string
    if "\\n" in private_key:
        private_key = private_key.replace("\\n", "\n")

    # Strip surrounding quotes if present
    private_key = private_key.strip('"').strip("'")

    # If the user only pasted the base64 string without PEM headers, wrap it properly
    if "BEGIN" not in private_key:
        import textwrap

        body = "\n".join(textwrap.wrap(private_key, 64))
        private_key = (
            f"-----BEGIN RSA PRIVATE KEY-----\n{body}\n-----END RSA PRIVATE KEY-----\n"
        )

    return GithubIntegration(integration_id=app_id, private_key=private_key)


def get_installation_token(installation_id: int) -> str:
    """
    Exchanges the GitHub App JWT for a short-lived (1 hr) installation access token.
    """
    integration = get_github_integration()
    access_token = integration.get_access_token(installation_id)
    return access_token.token


def get_github_client_for_installation(installation_id: int) -> Github:
    """
    Returns a PyGithub client authenticated as the GitHub App Installation.
    """
    token = get_installation_token(installation_id)
    return Github(login_or_token=token)
