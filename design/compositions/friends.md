# Friends

A person can negotiate against friends instead of the counterpart. They open a table, take a role, and share a link; each friend who follows the link takes one of the table's empty seats. Inviting keeps the link's code, and Tabling decides who sits where.

## Starting a table for friends

The [start endpoint](reaction:friends.starting.StartWithFriends) takes a scenario and the role the person wants to play. Like [a practice table](practice.md#starting-a-practice-table), it opens a table in Tabling, waits until the flow has settled so that [the table](table.md#seating) has a seat for each role, and seats the person in their role. It then invites people to the table with `Inviting.invite`, and responds with the table. The other seats stay empty, so the table can't begin until friends fill them. Only [a role of a published scenario](view:practice.starting.playable) can be chosen, and [a second endpoint at the same path](reaction:friends.starting.RefuseUnplayable) refuses anything else with `NOT_FOUND`.

```endpoints
friends.starting.StartWithFriends at /friends/start
friends.starting.RefuseUnplayable at /friends/start
```

Everyone seated at a table sees [its link's code](table.md#showing-the-table), so they can share it while seats are empty. The page builds the link, `/join/<code>`, from it.

## Joining through a link

A link's code is the only way to reach someone else's table. A table's own address can be guessed, and the table endpoints answer `NOT_FOUND` to anyone without a seat, so knowing the address isn't enough. The code [names the table it lets people into](view:friends.joining.invitedTo).

The [invitation endpoint](reaction:friends.joining.ShowInvitation) tells someone signed in what a link offers before they join. When the table [is waiting for someone](view:friends.joining.waitingForSomeone), because it hasn't begun and a seat is empty, it responds with [the invitation as they see it](former:friends.joining.invitationTo): the scenario and its recommended time limit, the username of the person who sent it, and the empty seats they could take, each with its role's summary. Someone who already sits at the table, such as the person who sent the link, gets the table instead, and the page takes them there. A table that is full or has begun is refused with `TABLE_FULL`, and a code no invitation has with `NOT_FOUND`.

The [join endpoint](reaction:friends.joining.Join) takes the code and the role to play. The page sends the only empty seat's role, or the one the person picks when several are empty. It seats them with `Tabling.seat`, and once their seat has joined the table's proposals, it responds with the table. Tabling refuses a seat someone took a moment earlier with `ROLE_TAKEN`, someone already at the table with `ALREADY_SEATED`, and a table that has begun or ended with `ALREADY_BEGUN`. [A second endpoint at the same path](reaction:friends.joining.RefuseUnknownCode) refuses a code no invitation has with `NOT_FOUND`. The join endpoint needs a session, so a friend without an account signs up first and then joins.

```endpoints
friends.joining.ShowInvitation at /friends/invitation
friends.joining.Join at /friends/join
friends.joining.RefuseUnknownCode at /friends/join
```

Once everyone is seated, the table [starts](table.md#starting) like any other: someone suggests how long to negotiate, and the clock starts when everyone agrees. Nobody at the table is the counterpart, so [its reactions](counterpart.md) never ask it anything there.
