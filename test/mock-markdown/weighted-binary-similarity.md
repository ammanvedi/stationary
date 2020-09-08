# An Adventure in Weighted Binary Similarity

In a recent side project I have come across the need to measure the similarity between a pair of binary numbers. For example given the pair;

```javascript
0 0 0 1 0 1 0
1 1 0 1 0 1 0
```

I would like a number either indicating how similar or how different they are. There are a plethora of ways that exist to measure this at the moment. Quite a few of which can be found in this excellent paper;

> [A Survey of Binary Similarity and Distance Measures](http://www.iiisci.org/journal/CV$/sci/pdfs/GS315JG.pdf) — Seung-Seok Choi, Sung-Hyuk Cha, Charles C. Tappert

By first converting the comparison into a set of intrinsic parameters they then define a total of 72 existing methods for combining these parameters in order to measure similarity. However all of these methods consider the binary numbers in their totality, that is the positioning of sections that are similar to each other have no bearing on the final similarity.

In my use case the binary numbers are representations of time-series events so from left to right we are proceeding in time

```javascript
0 0 1 0 1 1 0 1
// -----> Time
```

And when comparing similarity with another value i would like to bias towards values that match more on the right than the left, for example, given the original sequence A and to comparisons with it B and C;

```javascript
A | 0 0 1 0 1 1 0 1 // original
B | 0 0 1 0 0 0 1 0
C | 1 1 0 1 1 1 0 1
// -----> Time 
```

When you do not take into account the temoral aspect of my data the similarity of B and C when compared with A is the same, they both have a 50% match with A. However I would like C to win since temporally it matches more recently than B

For this I need to introduce some sort of bias or weighting, before that lets clarify exactly how we should do that;

### Weighting Functions

Lets say we have a list of items `[x1..xn]` function `f(x)` a bias is applied in situations where the final result is a combination of this function mapped over the terms in our list, for example if we take the function, apply it to each element and sum the results;

$$\sum_{i=1}^{n} f(x_{i})$$

Our weighting will allow us to change the contribution that a particular term makes to the whole, it takes the form of a function `w(x)` that takes in some parameters about the current term, for example it could be just the term itself, the index or anything you feel like. Based on this it returns a value to multiply the current term by, thus increasing or decreasing the corresponding value of `f(x)`

$$\sum_{i=1}^{n} w(x_{i})f(x_{i})$$

### Picking a Base Function

To act as `f(x)` in the above equations i'm going to pick the [Hamming Distance](https://en.wikipedia.org/wiki/Hamming_distance) algorithm. It is very simple;

> The Hamming distance between two equal-length strings of symbols is the number of positions at which the corresponding symbols are different.

and in code;

```purescript
hammingDistance :: Array Int -> Array Int -> Int
hammingDistance xs ys = 
  foldl (\acc (Tuple a b) -> 
      if a /= b 
        then (acc + 1) 
        else acc
    ) 0 (zip xs ys
```

### Designing the Weight Function

Remembering my use case I want the matches that appear towards the end of the binary number to be weighted heavier than values earlier in the string, I would like my weight function to look like this;

![https://i.imgur.com/gdYMUCK.png](https://i.imgur.com/gdYMUCK.png)

In order to construct this beast we will need to combine a couple of functions, but first lets define some variables

`wDelta` = the increase on top of `wMin` that the function will reach by the last term (i.e the highest point of the function)

`wMin`= the minimum weight multiple

`n`= the length of the binary sequence

Using these we can construct a simple line equation;

<img align="center" src="https://i.imgur.com/WtvuRH9.png" />


![A simple linear function](https://i.imgur.com/M2wKRaQ.png)

Giving a line that slowly increases from 1 to 1.5 over the course of the length of the string (`n=10` in this graphic)

Lets then deal with the little hockey stick upturn we want at the end, for this we can use the exponential  function translated a little along the x axis

<img align="center" src="https://i.imgur.com/N5ZYydU.png" />
<br/>
<br/>

![An exponential function](https://i.imgur.com/AwDqkME.png)

And by squishing these together we get the function

<img align="center" src="https://i.imgur.com/GdpUrCt.png" />

![Combination Function](https://i.imgur.com/GdpUrCt.png)

![Combination of both functions](https://i.imgur.com/Q9Ym9DU.png)

### Translating to Code

We can first create our weight function exactly as described above

```purescript
e :: Number
e = 2.718
    
weightFunction :: Number -> Number -> Number -> Number -> Number
weightFunction wDelta n wMin x =
  linearTerm + expTerm
  where
    linearTerm = ((wDelta / n) * x) + wMin
    expTerm = pow e (x - n)
```

And now create a new version of the hammingDistance function that instead of adding one for each position that is found to be different, will add one multiplied by the result of the weighting function. 

This means that if values are found to be different towards the end of the string they will contribute more to the final result and as such will increase the resulting hamming distance.

```purescript
hammingDistanceWeighted :: Array Int -> Array Int -> Number
hammingDistanceWeighted xs ys = 
  foldlWithIndex (\i acc (Tuple a b) -> 
      if a /= b 
        then (acc + (1.0 * (weightFn $ toNumber i))) 
        else acc
    ) 0.0 (zip xs ys)
    where
      arrLen = toNumber $ length xs
      weightFn = weightFunction 0.25 arrLen 1.0
```

### Evaluation

Lets look back to the original example under the basic Hamming Distance 

```
A | 0 0 1 0 1 1 0 1 // original
B | 0 0 1 0 0 0 1 0 // distance = 4
C | 1 1 0 1 1 1 0 1 // distance = 4
// ---> Time 
```

And the results using the weighted function

```
A | 0 0 1 0 1 1 0 1 // original
B | 0 0 1 0 0 0 1 0 // distance = 5.258...
C | 1 1 0 1 1 1 0 1 // distance = 4.197...
```

As we can see now, the string `C` has a smaller hamming distance which was the aim all along, using this weighting I can now distinguish based on time the difference between binary strings that otherwise have the same base hamming distance.

This code will be used in a little library I am working on called [Teller](https://github.com/ammanvedi/teller) where I am attempting to output descriptions of trends found in bank transaction data.

### Links

[Full Code Example](https://try.purescript.org/?session=8432f0cc-8025-e242-1afc-4f707875c52f)

[Teller](https://github.com/ammanvedi/teller)