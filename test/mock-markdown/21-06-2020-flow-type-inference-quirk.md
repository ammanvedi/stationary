# Flow's Type Inference Quirk

As the title states i wanted to share a little "quirk" with flow's type inference system, this is particularly interesting as its one of the areas where typescript and flow diverge completely.

Type inference allows the programmer to be less explicit about typing and hands the responsibility over to the type checker to work out the intended types based on the context of usage.

For example lets say we have

```jsx
// @flow

let x = "somestring"; // Inferred x: string
```

Based on the assignment in the declaration we can infer that x is of type string and carry this forward in the execution of the program. 

However there is danger in this in flow, if we were to do;

```jsx
// @flow
let x = "somestring"; // Inferred x: string | number

x = 5
```

Flow will not bind x to being a string in a strong manner, rather it will update the initial type of the variable to be a union of string and number. Interestingly flow does understand at which point the type of the variable changes and as such does provide type safety.

```jsx
// @flow

let x = "a";

const f = (g: string) => {}

f(x) // No error, x is still a string

x = 3;

f(x) // Error, x is now a number
```

So this is actually a different result when compared to if we were to explicityly type x as a union

```jsx
// @flow

let x: string | number = "a";

const f = (g: string) => {}

f(x) // Error, number is incompatible with string

x = 3;

f(x) // Error, number is incompatible with string
```

This is something to watch out for if you are used to typescripts method of binding the value to a type more strictly when performing inference