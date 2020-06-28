# Thinking About Intersections and Unions in Type Theory

# Type Theory: Thinking About Unions and Intersections

I am a Javascript developer by trade and I am aware that typing is not a new idea, but its adoption in javascript is relatively new. This means a lot of people like myself are confronting some ideas from type theory for the first time in detail.

Some type systems will allow you to create combination types, called union or intersection types. These have a relationship to set theory in both name and function, so let’s take a brief look at some basics from set theory that we’ll need.

## Set Unions and Intersections

Wikipedia sums up a set pretty well; > # A **set** is a collection of distinct objects

for example [A, B, C, D, E], visually this is easy to imagine;

![https://cdn-images-1.medium.com/max/2000/1*aSnhX8lrbFxPBssYauWjjQ.png](https://cdn-images-1.medium.com/max/2000/1*aSnhX8lrbFxPBssYauWjjQ.png)

*A simple example of a set*

We have a collection of items with no item repeated, in this example i have used letters but we could equally use numbers, animals, wizards etc etc, in fact there are some already defined sets for numbers for example the set of natural numbers;

ℕ = [1, 2, 3, 4, 5…]

### Unions on Sets

A union of two sets creates a new set that contains all items from both input sets;

![https://cdn-images-1.medium.com/max/2000/1*omccW0C6-e1snp5ylHI_Jg.png](https://cdn-images-1.medium.com/max/2000/1*omccW0C6-e1snp5ylHI_Jg.png)

*union of two sets*

### Intersections on Sets

An intersection between two sets creates a set that contains common elements of the input sets;

![https://cdn-images-1.medium.com/max/2000/1*UeqmFN2gQdcSYw5-Jpbi0Q.png](https://cdn-images-1.medium.com/max/2000/1*UeqmFN2gQdcSYw5-Jpbi0Q.png)

*intersection of two sets*

## Relation to Type Theory

Now that we have the basics we need from set theory we can apply this to type theory.

Say we have a couple of types that we will apply these operations to, TypeX and TypeY;

How do we model these types as sets so we can reason about what the resulting types UnionType and IntersectionType will look like?

My first instinct was always to model them as sets at the definition level, for example;

![https://cdn-images-1.medium.com/max/2000/1*5Dc6ODHlRyjqZsBwnKVIrA.png](https://cdn-images-1.medium.com/max/2000/1*5Dc6ODHlRyjqZsBwnKVIrA.png)

Each type forms a set, the members of which are the properties of the type.

**This is a dangerous way to think about it**

Why? Lets look at the definition of a intersection type from the Typescript docs; > # An intersection type combines multiple types into one. This allows you to add together existing types to get a single type that has all the features you need.

Well in our current mental model we would take all the items in the TypeX set and combine them with the TypeY set to create our intersection…

But that sounds like a union, not an intersection

The fallacy here is applying the set modelling to the type definition, what we should be doing is **applying the idea of the set to the possible values of the types!**

### Type Values as Sets

lets remind ourselves of the types we defined earlier

Now to enumerate all the possible values of each of these types would probably require more time than any of us have today, but its not necessary, to see the relations we just need to be selective about what we enumerate. For example here are some possible values of TypeX and TypeY

This may seem confusing but remember that an object

```javascript
{ stringProp: 'C', numberProp: 2, objectProp: {} }
```

Is still of type TypeX because it contains all valid properties required by TypeX

### Intersections (TypeX & TypeY)

Now we can take this knowledge and reason about the intersection type TypeX & TypeY as it will be the intersection of the sets of all possible **values** of each type.

The set will be made up of values that contain all props from TypeX and TypeY

All these will be valid members;

```javascript
{ stringProp: 'C', numberProp: 2, objectProp: {} }
{ stringProp: 'C', numberProp: 3, objectProp: {} }
{ stringProp: 'D', numberProp: 3, objectProp: {}, randomProp: [] }
```

The values with only members from one type will not be in the intersection as they only occur in one set

```javascript
// only in set of possible values for TypeX
{ stringProp: 'A', numberProp: 0 } 

// only in set of possible values for TypeY
{ objectProp: {} }
```

### Unions (TypeX | TypeY)

Applying this to unions we can see that all possible values for both sets are acceptable in the union type

This may be counter intuitive as you may have noticed it is possible to pass TypeX & TypeY into a value typed as TypeX | TypeY [but this is true](https://flow.org/try/#0C4TwDgpgBAKuEA0oF4oG8BQBIAzsATgJYB2A5gAr4D2YAXFHkWQDQYC+GGoks8AminTZiAVwC2AIwj5KNeqMnTWHLvCgBVYoSrFBcSEgA+vSHwDcnAMY68UAG4BDADYiI9Tdt2pMuAiQrUdFAA5A7BrFCRUApSMoH0AAzsQA) and it is up to us as the developer to be able to identify which type has been passed in, for example with the use of [disjoint/tagged unions](https://mariusschulz.com/blog/typescript-2-0-tagged-union-types).

## In Conclusion

It is useful to brush up on some very basic set theory when reasoning about union and intersection types, but the **application should always be on the possible values t**hat may be assigned to a type** NOT on the definition/fields of the type itself.**