# Passwords

Nadia has no Commons account, so she signs up with a username and a password. Registering stores her username, and Authenticating stores a verifier derived from her password. These endpoints call both, then start a session with Sessioning. They share [accounts](accounts.md) with the rest of the app.

The [register endpoint](reaction:reusable.passwords.entering.Register) first calls `Authenticating._acceptable`. When the password is too short or too long, the request is refused with `INVALID_PASSWORD` before anyone is registered, because the engine doesn't undo `Registering.register` when a later action in the same request is refused. Otherwise the endpoint registers the username, sets the password for the new user, and starts a session. A username someone already has is refused by `Registering.register` with `USERNAME_TAKEN`. That includes `wholepie`, the user that authors the built-in scenarios, and the username of anyone who signed in with Commons, so nobody can take over Sam's account by signing up as `sam` after he signed in with Commons. For any caller, a password outside those lengths is still refused by `Authenticating.set` with `INVALID_PASSWORD`, and a second password for the same user with `PASSWORD_SET`.

The [sign-in endpoint](reaction:reusable.passwords.entering.SignIn) calls `Registering._byUsername` for the user, checks the password with `Authenticating.authenticate`, and starts a new session. A username nobody has is refused with `INVALID_CREDENTIALS`, the same refusal as a wrong password. `wholepie` has no password, so it is refused the same way, and nobody can sign in as it; so is Sam, who signed in with Commons and has no password either.

Each endpoint responds with the user, the session, and its expiry, and the HTTP server moves the session into a cookie that the page's scripts can't read, as `passwordsHttp` beside the endpoints declares.

```endpoints
reusable.passwords.entering.Register at /auth/register
reusable.passwords.entering.SignIn at /auth/login
```

_Adapted from [conceptbox](https://github.com/mit-sdg/conceptbox), MIT License, Copyright (c) 2026 Eagon Meng._
