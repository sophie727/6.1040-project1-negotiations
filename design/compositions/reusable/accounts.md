# Accounts

Every person is created by `Registering.register`, which stores the username they sign in with. `Sessioning.use` returns a session's user on each request. Neither concept refers to the other. [Passwords](passwords.md) registers people, gives them a password, and starts their sessions.

The [me endpoint](reaction:reusable.accounts.identifying.Me) passes the session to `Sessioning.use`, which returns the user, then responds with the user's username from `Registering._username`. Every endpoint that requires a session starts the same way: `Sessioning.use` returns the session's user, or the request is refused with `NOT_SIGNED_IN`. Each endpoint reads the user from the session, never from the request's inputs. Signing up or in responds with the user, and the page then calls the me endpoint for the username.

```endpoints
reusable.accounts.identifying.Me at /auth/me
```

The [sign-out endpoint](reaction:reusable.accounts.leaving.SignOut) ends the session with Sessioning, and the HTTP server clears the cookie. If the person is also signed in on another computer, they stay signed in there.

```endpoints
reusable.accounts.leaving.SignOut at /auth/logout
```

_Adapted from [conceptbox](https://github.com/mit-sdg/conceptbox), MIT License, Copyright (c) 2026 Eagon Meng._
