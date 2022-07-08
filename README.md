# nestjs-create-param-decorator-with-injections

A library providing service injections through an object that will be used in
the `createParamDecorator` like function.

# Example
```ts
import { createParamDecoratorWithInjections } from 'nestjs-create-param-decorator-with-injections'

const UserSettings = createParamDecoratorWithInjections(async (_data, _ctx, { user, db }) => {
  const settings = await db.settings.where({ owner: user })
  return settings
}, { user: UserService, db: DatabaseService }) // Services to inject

@Injectable()
class AppService {
  getUserTheme(@UserSettings() settings: UserSettings) {
    return settings
  }
}
```

The `createParamDecoratorWithInjections` function is very similar to
`createParamDecorator` but the function it takes also have the two more
arguments where the third argument is providing the services that are injected
and the fourth one contains extra data such as the initial data passed to the
decorator.

# Support
To support the project, you can send donations to following addresses:

```md
- Bitcoin     : bc1qtut2ss8udkr68p6k6axd0na6nhvngm5dqlyhtn
- Bitcoin Cash: qzmmv43ztae0tfsjx8zf4wwnq3uk6k7zzgcfr9jruk
- Ether       : 0xf542BED91d0218D9c195286e660da2275EF8eC84
```

