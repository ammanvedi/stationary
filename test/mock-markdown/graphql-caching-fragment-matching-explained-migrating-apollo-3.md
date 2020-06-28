# GraphQL Caching, Fragment Matching and Moving Towards Apollo Client 3.0

If we have a good understanding about how the cache works we can leverage it to make our code simpler and reduce the number of requests we need to make to our GraphQL services.

In order to best take advantage of the cache on the client side it must be taken into account when designing the schema's types, queries and mutations. Often this is undertaken by a different team so our understanding of the cache should be used to inform decisions on the server side.

Currently the stable version of Apollo Client React sits at major version 2. This version enables several methods for caching and more specifically fragment matching. The goal here is to explain

1. GraphQL basics
2. How the Apollo Client cache works in general
3. What is fragment matching and how it works in Apollo client 2.x
4. The move away from explicit fragment matchers to possibleTypes in Apollo Client React 3.0
5. What changes need to be made for a migration from 2.0 to 3.0

# Examples Repository

[The examples in this post can be run in a standalone playground that can be found here](https://github.com/ammanvedi/graphql-cache-playground) 

# The Schema and Types

Lets take a look at an example schema

```graphql
# We have interfaces
interface Node {
    id: ID!
    name: String!
}

# Enums too
enum PokemonType {
    GRASS
    WATER
    FIRE
    ICE
    ELECTRIC
    PSYCHIC
}

# Types declaration, this type implements the interface declared earlier
type Pokemon implements Node {
    id: ID! # a special type for referring to an objects ID
    name: String!
    type: [PokemonType!]! # a ! indicates that the field is non nullable
    hp: Int!
}

# Normal types like this are referred to as concrete types as they
# are set in stone, this differentiates them from interfaces which
# can be extended
type Trainer implements Node {
    id: ID!
    name: String!
    hometown: String!
}

# Here we have a union type, in this case Character could either
# be Pokemon or Trainer.
union Character = Pokemon | Trainer

enum PotionType {
    HEALTH
    ENERGY
}

type Potion implements Node {
    id: ID!
    name: String!
    potionType: PotionType!
}

enum BallType {
    NORMAL
    MASTER
}

type Pokeball implements Node {
    id: ID!
    name: String!
    count: Int!
    ballType: BallType!
}

union InventoryItem = Pokeball | Potion

type Pokedex {
    lastSeenPokemon: Pokemon
    totalSeenPokemon: Int!
    items: [InventoryItem!]!
}

# This is our root query type, it defines all the operations
# that are available to fetch data. Declarations within are
# very similar to function signitures in many typed languages
type Query {
    pokedex: Pokedex
    characters: [Character!]!
    pokemon(type: PokemonType): [Pokemon!]!
}

# Input types have distinct declarations
# From the spec:
# Object types can contain fields that define arguments or contain 
# references to interfaces and unions, neither of which is appropriate
# for use as an input argument. 

input SetPokemonFields {
    name: String
    type: [PokemonType!]
    hp: Int
}

# Our root mutation type, declares all operations available to 
# change data
type Mutation {
    updatePokemon(id: ID!, set: SetPokemonFields!): Pokemon
}
```

# The Cache

## Why do we Need the Cache?

### Reducing Number Of Calls to Endpoints

By leveraging the cache in combination with a fetchPolicy we can prevent repeating queries that we have already made;

![GraphQL%20Caching%20Fragment%20Matching%20and%20Moving%20Towar%2060e7df111be04b53986c89c4f9f0aa4e/reduce_calls.png](../../../../../Desktop/md/GraphQL%20Caching%20Fragment%20Matching%20and%20Moving%20Towar%2060e7df111be04b53986c89c4f9f0aa4e/reduce_calls.png)

Components A and B both use a fetchPolicy of cache-first, we initially request the data for component A but we can pull it from the cache when requesting component B.

### Keeping Client and Server State in Sync

When we make a request containing a mutation, our data's state will change. We need to reflect this on the client side. If we return the data that has updated our cache can handle broadcasting this update to relevant components.

![GraphQL%20Caching%20Fragment%20Matching%20and%20Moving%20Towar%2060e7df111be04b53986c89c4f9f0aa4e/state_parity.png](../../../../../Desktop/md/GraphQL%20Caching%20Fragment%20Matching%20and%20Moving%20Towar%2060e7df111be04b53986c89c4f9f0aa4e/state_parity.png)

We mutate X the updated X value is reflected in all components that use it, a behaviour that most web applications require. With a properly designed schema it comes for free.

# How Does The Cache Work

## Overall Structure

The Apollo Cache conforms to a pretty simple interface;

```jsx
export interface NormalizedCache {
  get(dataId: string): StoreObject;
  set(dataId: string, value: StoreObject): void;
  delete(dataId: string): void;
  clear(): void;
  toObject(): NormalizedCacheObject;
  replace(newData: NormalizedCacheObject): void;
}
```

This enables you to implement the cache in any way that you see fit as long as you conform to this interface. In the case of InMemoryCache for example the cache is just a simple object stored in memory. 

## Cache Keys and Automatic Updates

In order to store data in the cache each object needs to have a key that can be calculated again in the future deterministically. The first level of caching happens at the query and mutation level

Lets look at the simplest possible example, we make this query

***Please note: the representations of the cache are based on the actual cache object (which can be viewed using cache.extract() in Apollo Client 3, rather than what is seen in Apollo dev tools)***

```graphql
query PokedexQuery {
	pokedex {
		totalSeenPokemon
		lastSeenPokemon {
			hp
			name
			type
		}
	}
}
```

And we get this result

```json
{
   "data":{
      "pokedex":{
				 "totalSeenPokemon": 100,
         "lastSeenPokemon":{
            "name":"Dragonite",
            "type":[
               "FIRE"
            ],
            "hp":100,
            "__typename":"Pokemon"
         },
         "__typename":"Pokedex"
      }
   }
}
```

It will be stored in the cache as 

```json
{
  "ROOT_QUERY": {
    "__typename": "Query",
    "pokedex": {
      "__typename": "Pokedex",
			"totalSeenPokemon": 100,
      "lastSeenPokemon": {
        "__typename": "Pokemon",
        "name": "Dragonite",
        "type": [
          "FIRE"
        ],
        "hp": 100
      }
    }
  }
}
```

If we were to visualise this as a graph we would see;

![GraphQL%20Caching%20Fragment%20Matching%20and%20Moving%20Towar%2060e7df111be04b53986c89c4f9f0aa4e/Screenshot_2020-06-17_at_16.59.38.png](../../../../../Desktop/md/GraphQL%20Caching%20Fragment%20Matching%20and%20Moving%20Towar%2060e7df111be04b53986c89c4f9f0aa4e/Screenshot_2020-06-17_at_16.59.38.png)

Lets spice things up a bit, lets now add in some parameters to the query and also lets make a query where we are returned an array;

```graphql
query PokemonQuery {
	pokemon(type: ELECTRIC) {
		name,
		type,
		hp
	}
}
```

and then we get the following result

```json
{
   "data":{
      "pokemon":[
         {
            "name":"Pikachu",
            "type":[
               "ELECTRIC"
            ],
            "hp":100,
            "__typename":"Pokemon"
         }
      ]
   }
}
```

This will be stored in the cache as

```json
{
  "ROOT_QUERY": {
    "__typename": "Query",
    "pokemon({\"type\":\"ELECTRIC\"})": [
      {
        "__typename": "Pokemon",
        "name": "Pikachu",
        "type": [
          "ELECTRIC"
        ],
        "hp": 100
      }
    ]
  }
}
```

And visualised;

![GraphQL%20Caching%20Fragment%20Matching%20and%20Moving%20Towar%2060e7df111be04b53986c89c4f9f0aa4e/Screenshot_2020-06-17_at_17.02.39.png](../../../../../Desktop/md/GraphQL%20Caching%20Fragment%20Matching%20and%20Moving%20Towar%2060e7df111be04b53986c89c4f9f0aa4e/Screenshot_2020-06-17_at_17.02.39.png)

We should notice the following things about the way these have been stored;

1. Objects are explicitly related to the query that requested them via their position in the cache
2. The object key includes variables that are part of the query

Now what if we know Pikachu has an id of "3" and we have a mutation in our schema that will make an update to this Pokemon;

```json
mutation UpdatePokemon {
	updatePokemon(id: "3", set: { hp: 800 }) {
		hp
	}
}
```

Because we are lazy we want the following to be done for us when we make this mutation

1. Data to be updated and stored in the cache
2. Any components that reference this data, for example the one using our initial query, to be updated and re rendered.

But we have a problem with that. As we found before the data was stored with the query that selected it  so somehow when we receive our response we need to be able to locate our current pikachu data in the cache and update it.

But at the moment we do not have enough information to do that, the mutation is completely independent of that query. If we were to make that mutation our cache would end up looking like this;

![GraphQL%20Caching%20Fragment%20Matching%20and%20Moving%20Towar%2060e7df111be04b53986c89c4f9f0aa4e/Screenshot_2020-06-17_at_17.05.20.png](../../../../../Desktop/md/GraphQL%20Caching%20Fragment%20Matching%20and%20Moving%20Towar%2060e7df111be04b53986c89c4f9f0aa4e/Screenshot_2020-06-17_at_17.05.20.png)

Because we dont have enough information in the response data to tell Apollo how to find the already existing data and update it.

We need to de couple the data from the query by giving it a cache key that we are able to re calculate later.

To do this lets see what happens when we include the Pokemon's id in our query

```graphql
query PokemonQuery {
	pokemon(type: ELECTRIC) {
		id,
		name,
		type,
		hp
	}
}
```

As if by magic our data is now stored in the cache as 

```json
{
  "Pokemon:3": {
    "id": "3",
    "__typename": "Pokemon",
    "name": "Pikachu",
    "type": [
      "ELECTRIC"
    ],
    "hp": 100
  },
  "ROOT_QUERY": {
    "__typename": "Query",
    "pokemon({\"type\":\"ELECTRIC\"})": [
      {
        "__ref": "Pokemon:3"
      }
    ]
  }
}
```

![GraphQL%20Caching%20Fragment%20Matching%20and%20Moving%20Towar%2060e7df111be04b53986c89c4f9f0aa4e/Screenshot_2020-06-17_at_17.07.11.png](../../../../../Desktop/md/GraphQL%20Caching%20Fragment%20Matching%20and%20Moving%20Towar%2060e7df111be04b53986c89c4f9f0aa4e/Screenshot_2020-06-17_at_17.07.11.png)

Now that we have an ID our object is no longer keyed by the query path, and if we update our mutation to include the id also

```graphql
mutation UpdatePokemon {
	updatePokemon(id: "3", set: { hp: 213123 }) {
		id
		hp
	}
}
```

Now since all we need to be able to derive the cache key is the id and the typename we can update our cache entry with the new data!

Both our query and mutation will have a reference link to our `Pokemon:3` data

```json
{
  "Pokemon:3": {
    "id": "3",
    "__typename": "Pokemon",
    "name": "Pikachu",
    "type": [
      "ELECTRIC"
    ],
    "hp": 213123
  },
  "ROOT_QUERY": {
    "__typename": "Query",
    "pokemon({\"type\":\"ELECTRIC\"})": [
      {
        "__ref": "Pokemon:3"
      }
    ]
  },
  "ROOT_MUTATION": {
    "__typename": "Mutation",
    "updatePokemon({\"id\":\"3\",\"set\":{\"hp\":213123}})": {
      "__ref": "Pokemon:3"
    }
  }
}
```

![GraphQL%20Caching%20Fragment%20Matching%20and%20Moving%20Towar%2060e7df111be04b53986c89c4f9f0aa4e/Screenshot_2020-06-17_at_17.08.02.png](../../../../../Desktop/md/GraphQL%20Caching%20Fragment%20Matching%20and%20Moving%20Towar%2060e7df111be04b53986c89c4f9f0aa4e/Screenshot_2020-06-17_at_17.08.02.png)

But we must make sure that the type that the mutation returns is the same as the type that we have already requested. In this case both must be of type 'Pokemon' so the same cache key `Pokemon:3` can be generated from the query and also separately from the mutation response data. If your team is not in charge of the schema this is why it is important to discuss any changes/proposals.

Automatic cache updates are very useful when updating items that have been returned from other queries, however there are some situations where this will not happen automatically

## Non Standard and Missing IDS

In order to do things automatically for you Apollo assumes two things when trying to generate a cache key for your data

1. Your data has an `ID` that is stored under an `id` or `_id` property
2. Your data has a `__typename`

Point 2 you can take for granted this is handled for you in most cases and if type names are missing it is more likely to be an error in your configuration rather than an intentional decision. Point 1 we might come across in a couple of situations

1. Your data uses some other property name as an id
2. Your data has no explicit id and it doesnt make sense to give it one

For these scenarios Apollo provides dataIdFromObject

Lets take an example query

```graphql
query Pokedex {
  pokedex {
    lastSeenPokemon {
      ...PokemonFragment
      __typename
    }
    __typename
  }
}
fragment PokemonFragment on Pokemon {
  name
  type
  hp
  __typename
}
```

and the response

```json
{
   "data":{
      "pokedex":{
         "lastSeenPokemon":{
            "name":"Dragonite",
            "type":[
               "FIRE"
            ],
            "hp":100,
            "__typename":"Pokemon"
         },
         "__typename":"Pokedex"
      }
   }
}
```

and the resulting cache representation

```graphql
{
  "ROOT_QUERY": {
    "__typename": "Query",
    "pokedex": {
      "__typename": "Pokedex",
      "lastSeenPokemon": {
        "__typename": "Pokemon",
        "name": "Dragonite",
        "type": [
          "FIRE"
        ],
        "hp": 100
      }
    }
  }
}
```

![GraphQL%20Caching%20Fragment%20Matching%20and%20Moving%20Towar%2060e7df111be04b53986c89c4f9f0aa4e/Screenshot_2020-06-17_at_17.16.31.png](../../../../../Desktop/md/GraphQL%20Caching%20Fragment%20Matching%20and%20Moving%20Towar%2060e7df111be04b53986c89c4f9f0aa4e/Screenshot_2020-06-17_at_17.16.31.png)

Our Pokedex data is stored under the Pokedex query. Now if we wanted to update this we would fall into a similar situation that we had previously when we had no ID. In this situation we can assume that the Pokedex query is going to serve us back the pokedex for whichever user made the request so even though the Pokedex has no intrinsic id its typename is enough to identify it.

Using dataIdFromObject we can write

```jsx
const dataIdFromObject: KeyFieldsFunction = (object, ctx) => {
  switch(object.__typename) {
    case "Pokedex":
      return "Pokedex";
  }

  return defaultDataIdFromObject(object, ctx)
}
```

and then pass it to the cache

```jsx
const client = new ApolloClient({
  cache: new InMemoryCache({ dataIdFromObject }),
	...
});
```

This will key the Pokedex object under Pokedex and fall back to the default dataIdFromObject implementation otherwise.

![GraphQL%20Caching%20Fragment%20Matching%20and%20Moving%20Towar%2060e7df111be04b53986c89c4f9f0aa4e/Screenshot_2020-06-17_at_17.23.10.png](../../../../../Desktop/md/GraphQL%20Caching%20Fragment%20Matching%20and%20Moving%20Towar%2060e7df111be04b53986c89c4f9f0aa4e/Screenshot_2020-06-17_at_17.23.10.png)

As previously we have now de coupled the Pokedex data from the query that made it. You can also use dataIdFromObject if you have non standard id names as by default Apollo Client will only look for an `id` or `_id` property name.

## Manual Cache Updates

Often when updates happen to things that are not concrete types (i.e. objects with a `__typename`) or a new instance of a concrete type is created we have to intervene manually for our query to update

### Updating Items in List Queries

This is very well documented in the [official docs](https://www.apollographql.com/docs/react/v2.5/advanced/caching/#updating-after-a-mutation)

## Fragment Matching and Strengthening Type Safety

### Type Safety and the Need for Validation

One of the biggest advantages to GraphQL is the schema. The schema provides a language-agnostic description of;

1. Every individual type of our data model
2. The operations that can be used to fetch these types
3. The operations that can be used to update these types

We in the front end leverage this a lot through code generation tools. We generate types for the queries we make and use this to improve our experience as developers and prevent silly mistakes. 

This protection, at least in the realm of JS exists at compile time only. Meaning normally we do not have type safety at the boundaries of our program. This is why we do things like form validation.

![GraphQL%20Caching%20Fragment%20Matching%20and%20Moving%20Towar%2060e7df111be04b53986c89c4f9f0aa4e/demons.png](../../../../../Desktop/md/GraphQL%20Caching%20Fragment%20Matching%20and%20Moving%20Towar%2060e7df111be04b53986c89c4f9f0aa4e/demons.png)

Well with GraphQL its very easy to validate the data that we get back from the server since we know exactly what we requested! So its trivial to validate that when we request 

```graphql
query PokedexQuery {
	pokedex {
		totalPokemonSeen
	}
}
```

and receive 

```json
{
	"totalPokemaaaaaaan": 123
}
```

Something has gone terribly wrong. The same logic applies when we manually write a query or fragment to the cache we can validate the data that we want to write against our query document.

### Fragments and the Challenges They Pose to Validation

Fragments simply re-usable sets of fields that allow us to avoid repeating ourselves.

```graphql
fragment PokedexFields on Pokedex {
	totalPokemonSeen
	pokeBallCount
}

query {
	pokedex {
		...PokedexFields
	}
}
```

Now say we receive the following response from the above query

```json
{
	"__typename": "Pokedex",
	"totalPokemonSeen": 100,
	"pokeBallCount": 5
}
```

It is not as simple any more as checking each field on the response against the query as these fields have been collapsed into `...PokedexFields`  so we need to first expand this fragment.

Now we could do this in a very naive fashion where we simply replace `...PokedexFields` with the fields in the fragment. But we have extra information in the form of the `__typename` that we can use to infer if this will even be successful.

A fragment matcher will do this initial inference and if a match is found will allow us to expand the fragment and continue matching fields as normal.

This is the basic structure of a fragment matcher. The type condition here is what type or interface the fragment is applied to, in the above example it would be `"Pokedex"`

```jsx
export interface FragmentMatcherInterface {
  match(
    typeCondition: string,
    value: object,
  ): boolean | 'heuristic';
}
```

***NOTE: this is a simplified view of the type signature the real signature is provided in the Additional Notes section at the end of this post***

### Heuristic Fragment Matching

> A heuristic technique, is any approach to problem solving, learning, or discovery that employs a practical method not guaranteed to be optimal or perfect, but sufficient for the immediate goals

This method is very simple and is the default way of fragment matching in Apollo Client. The algorithm plays out as follows;

```javascript
if value.__typename === typeCondition
	return true
else
	return 'heuristic'
```

If the types match exactly then we return true. If not we do something very peculiar, we return `'heuristic'` and the source explains this best

```javascript
// At this point we don't know if this fragment should match or not. It's
// either:
//
// 1. (GOOD) A fragment on a matching interface or union.
// 2. (BAD) A fragment on a non-matching concrete type or interface or union.
//
// If it's 2, we don't want it to match. If it's 1, we want it to match. We
// can't tell the difference, so we warn the user, but still try to match
// it (for backwards compatibility reasons). This unfortunately means that
// using the `HeuristicFragmentMatcher` with unions and interfaces is
// very unreliable. This will be addressed in a future major version of
// Apollo Client, but for now the recommendation is to use the
// `IntrospectionFragmentMatcher` when working with unions/interfaces.
```

This essentially means that if the typename is not an exact match apollo will expand it anyway and the match depends on wether all fields in the fragment exist on the object type. 

Wat?

Lets take an example schema

```graphql
interface Item {
	name: String!
}

type Pokeball implements Item {
	name: String!
	ballType: String!
}

type Potion implements Item {
	name: String!
	potionType: String!
}

union Items = Potion | Pokeball

type Query {
	items: [Items!]!
}
```

and an example query

```graphql
query {
	items {
		... on Item {
			name
		}
		... on Pokeball {
			ballType
		}
		... on Potion {
			potionType
		}
	}
}
```

and say we get the response

```graphql
[
	{
		"__typename": "Pokeball",
		"name": "My First Ball"
		"ballType": "MASTER"
	}
]
```

So then lets try to match the structure of the returned object to the type we specified in the `items` query.

1. We check the first fragment — `on Item`
    1. We check if the `__typename` of the data matches `Item` as declared on the fragment, it does not, but this is a heuristic method so we expand the fragment and try to match the name field, which works
2. We check the second fragment — `on Pokeball`
    1. We check if the `__typename` matches `Pokeball` as declared on the fragment. It does so we expand the fragment and match all fields without an issue
3. We check the last fragment — `on Potion`
    1. We check if the `__typename` of the data matches `Potion` as declared on the fragment. It does not. But we expand anyway and try to match the `potionType` field. It fails and causes the whole match to fail and we also get a warning in the console.

We should have never done the last check, from the schema we know that `Pokeball` and `Potion` are subtypes of `Item` and should not be matched on the same object.

### Introspective Fragment Matching

With an `IntrospectionFragmentMatcher` we provide the schema as JSON and with this information we construct the following map which describes the relationship between interfaces and their implementing types, this is called the `possibleTypes` map

```json
{
	"Item": ["Pokeball", "Potion"]
}
```

The introspective matching algorithm goes as follows

```javascript
create possibleTypes map from introspection result JSON

if value.__typename === typeCondition
	return true
else if possibleTypes[typeCondition] contains value.__typename
	return true
else
	return false
```

So lets run through that previous example again and see what the out come is

1. We check the first fragment — `on Item`
    1. We check if the `__typename` of the data matches `Item` as declared on the fragment, it does not, **we then check if `possibleTypes[Item]` contains `Pokeball` it does, so we can match fields**
2. We check the second fragment — `on Pokeball`
    1. We check if the `__typename` matches `Pokeball` as declared on the fragment. It does so we expand the fragment and match all fields without an issue
3. We check the last fragment — `on Potion`
    1. We check if the `__typename` of the data matches `Potion` as declared on the fragment. It does not. **we then check if `possibleTypes[Potion]` contains `Pokeball` it does not, so we return false and avoid expanding the fragment `... on Potion`**

Which results in relevant fragments being matched and irrelevant ones being ignored

# Apollo Client 3.0

## Project Structure Updates

Apollo used to be made up of several very independent packages which had to be imported separately for example 

```jsx
import gql from 'graphql-tag';
import { useQuery } from '@apollo/react-hooks';
```

However now these are all imported from the `@apollo/client` package

```jsx
import { gql, useQuery, ApolloClient, InMemoryCache } from '@apollo/client'
```

## Updates to the Cache

### The New possibleTypes Configuration

The main change in the client configuration comes from the fact that the included fragment matchers have been removed in favour of passing a possible types map. This was something that was generated inside the client previously, based on the introspection schema. Now it needs to be generated outside. 

Based on Apollo 2.6.8 this function can be used to generate the appropriate map. Although there may be better solutions, for example `graphql-codegen`

```jsx
private parseIntrospectionResult(
    introspectionResultData: IntrospectionResultData,
  ): PossibleTypesMap {
    const typeMap: PossibleTypesMap = {};
    introspectionResultData.__schema.types.forEach(type => {
      if (type.kind === 'UNION' || type.kind === 'INTERFACE') {
        typeMap[type.name] = type.possibleTypes.map(
          implementingType => implementingType.name,
        );
      }
    });
    return typeMap;
  }
```

Apollo also provide a script that will fetch the schema in their docs [here](https://www.apollographql.com/docs/react/v3.0-beta/data/fragments/#generating-possibletypes-automatically)

### Cache Eviction

`cache.evict(id, field?)`

Remove a specific item from the cache based on its cache key

### Garbage Collection

`cache.gc()`

This new method will allow you to purge anything from the cache that is unreachable from the root objects in the cache (`ROOT_QUERY` `ROOT_MUTATION`)

`cache.retain(id)`

Another new method that prevents an object being removed from the cache even if it is unreachable from known roots.

`cache.release(id)`

Basically reverses the retain operation and makes the previously retained object eligible to be garbage collected again.

# In Conclusion

The main take aways are 

- Ensure involvement in schema changes to make sure that automatic updates can be leveraged as much as possible
- Upgrade path to Apollo 3 should be smooth but will require a change to generate `possibleTypes` map
- Leverage `dataIdFromObject` if your data has non standard ids or is user specific data that has no id at all.
- Your data is a graph. The cache is a graph where data, queries and mutations are the nodes

# Additional Resources

- [The Concepts of GraphQL - apollographql.com](https://www.apollographql.com/blog/the-concepts-of-graphql-bc68bd819be3)
- [Why is there a separate input type? - stackoverflow.com](https://stackoverflow.com/questions/41743253/whats-the-point-of-input-type-in-graphql)
- [Full Apollo Client 3.0 changelog - github.com](https://github.com/apollographql/apollo-client/blob/v3.0.0-rc.0/CHANGELOG.md)
- [Cache Eviction in Apollo Client 3.0 - apollographql.com](https://www.apollographql.com/docs/react/v3.0-beta/caching/cache-interaction/#garbage-collection-and-cache-eviction)
- [Reasoning behind no longer generating query path ids for non normalised objects - github.com](https://github.com/apollographql/apollo-client/pull/5146)