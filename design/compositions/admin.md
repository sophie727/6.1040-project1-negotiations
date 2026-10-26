# The admin

The admin keeps the bakery tidy. They sign in like anyone else, as `admin`, with the password the server's settings give, and they can take any scenario out of the bakery, whoever wrote it, such as a test scenario someone forgot, or one that shouldn't be there.

## Who the admin is

The admin is [the person whose username is `admin`](view:admin.access.isAdmin). On every start, before anyone can sign up, the server registers that username if nobody has it yet, so nobody else can take it, and Registering never changes a username. When the setting `ADMIN_PASSWORD` is given, the server resets the account's password in Authenticating to it, so the admin signs in with whatever the settings say, even after they change. Without the setting, the account has no password, and nobody can sign in as it.

## Archiving anyone's scenario

The admin [archives](reaction:authoring.archiving.Archive) a scenario as its author would, and it leaves the bakery the same way. Posting remembers who archived it, and the endpoints read [their username](view:admin.access.archivedBy), so the author sees that the admin archived it. A scenario [the admin archived](view:admin.access.archivedByAdmin) stays out of the bakery until the admin [puts it back](reaction:authoring.archiving.Unarchive): its author is refused with `ARCHIVED_BY_ADMIN`. The admin can also put back a scenario its author archived.

## Every posted scenario

The admin can't find an archived scenario in the bakery, and doesn't write most scenarios, so the [overseeing endpoint](reaction:admin.overseeing.ShowPosted) responds with [every posted scenario](former:admin.overseeing.postedScenarios), archived or not, in the order they were posted, each with its name, its author's username, whether it is archived, and the username of whoever archived it. Anyone else is refused with `NOT_FOUND`, as if there were nothing there.

```endpoints
admin.overseeing.ShowPosted at /admin/scenarios
```
