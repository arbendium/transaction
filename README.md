# virtual-transaction

So you like distributed systems? Just can't get enough of them? Do you have an urge to turn your nice, simple, easy-to-follow code into an asynchronous undeterministic distributed state management nightmare?

No? Well, too bad. Virtually all sufficiently complex applications have to, at some point, deal with problems that characterize distributed systems: concurrency, partial failures, bottlenecks requiring clever caching, batching etc. Usually, DBMS would take care of aat least the first two problems, but as application get more complex, these problems start to pop up within the application.

