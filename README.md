# hypercloud-admin-cli

Admin command-line shell for [hypercloud](https://github.com/datproject/hypercloud).

```
npm i -g hypercloud-admin-cli
hypercloud-admin
```

![hypercloud-admin-cli.gif](hypercloud-admin-cli.gif)


```
  Commands:

    help [command...]         Provides help for a given command.
    exit                      Exits application.
    login                     Login to the server
    list-users [options]      
    user [options] <id>       Show user record. (ID, username, or email.)
    suspend <id> [reason...]  Suspend the user. (ID, username, or email.)
    unsuspend <id>            Unsuspend the user. (ID, username, or
                              email.)
```