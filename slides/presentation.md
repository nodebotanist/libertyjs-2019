footer: LibertyJS 2019 -- @nodebotanist
slidenumbers: true

## V8, WebAssembly, and the **Future of JS and a Multi-Language Web**

![](./img/Carina_Nebula.jpg)

^Today, I'm here to talk about something I'm super excited about, and I hope by the end, you will be too

---

## About Me

![](./img/Carina_Nebula.jpg)

![left](./img/alladinsane.jpg)

* Robotics Author/Addict
* Developer 🥑@ CloudFlare
* Twitch streams hardware/software @nodebotanist

^Written 2 books on IoT with JavaScript

---

## About Me (Mx. Kassian Wren!)

![](./img/Carina_Nebula.jpg)

![left fit](./img/wedding2.jpeg)

* Robotics Author/Addict
* Developer 🥑@ CloudFlare
* Twitch streams hardware/software @nodebotanist

^Written 2 books on IoT with JavaScript

---

![left original](./img/ace.jpg)
![right original](./img/Arya.jpg)

---

#[fit] What even is **WebAssembly**?

![](./img/Carina_Nebula.jpg)

^I find the best way to start saying what Web Assembly is by saying what it isn't

---

![](./img/Carina_Nebula.jpg)

# What WebAssembly is **NOT**

* just a programming language or instruction set (it's so much more than that)
* the death of JS (probably)
* something you can just ignore cause it's gonna go away

![right fit](https://media.giphy.com/media/eenSmyv5VGhzUNTiWy/giphy.gif)

^There are toolchains that we'll talk about later that will explain what I mean
LinkedIn will be asking for 5 years WebAssembly programming exp in about 6 months
This is such a big thing that you cannot ignore it in the long run

---

![](./img/Carina_Nebula.jpg)

# What WebAssembly **IS**

* A compilation target for other languages to compile to, as well as a language in itself
* An augmentation of the abilities of JS by allowing other languages to operate in the browser
* But most importantly...

^You CAN write WebAssembly code, but you can also compile to it in other languages.
This can forever change how we code for the browser.

---

![](./img/Carina_Nebula.jpg)

* Pretty literally\* **magic(k)**

![inline](https://media.giphy.com/media/3o84U6421OOWegpQhq/giphy.gif)

\* - no not really literally but I'll explain later

---

![](./img/Carina_Nebula.jpg)

# WebAssmebly is a **compilation target**

* You write code in other languages and compile them into WebAssembly
* Rust, C/C++, Go, C#; these are just a few of the languages with WebAssembly as a compile target

^Because why re-write codebases when you can just compile them to a new target?

---

![](./img/Carina_Nebula.jpg)

## But the question you then have to ask is...

---

![left](./img/WHAT.jpeg)

![right](./img/WHY.jpeg)

---

![](./img/Carina_Nebula.jpg)

## There are *so many reasons* you would want this in your life

---

![](./img/Carina_Nebula.jpg)

# THIS IS **A NEW ERA FOR THE WEB**

^I'm not exaggerating, or playing it up. This brings a real shift in how we code for the web

---

![](https://media.giphy.com/media/h2OLfcSKKthRK/giphy.gif)

---

![](./img/Carina_Nebula.jpg)

# No but **seriously**

WebAssembly is comparable to bringing the power analogous to the JVM **into the browser**, creating an **evolution of the web as we know it**.

![inline](https://media.giphy.com/media/A9rtrLGbNZjgc/giphy.gif)

^Compare LLVM to toolchains like wasm-pack and Blazor

---

![](https://media.giphy.com/media/UnTC9o2HMyUta/giphy.gif)

^Okay, you're with me a little, so let's look at some pictures that will help me explain.

---

#### **Ancient.png**

![fit original](./img/ancient.png)

^ Everything is on the server, and new information requires a refresh of the entire page

---

#### **Then.png**

![fit original](./img/then.png)

^ Ajax allowed us to build real applications on the web, and business logic started to distribute itself between client and server

---

#### **Now.png**

![fit original](./img/now.png)

^Between Service Workers and WebAssembly, we can do so much so quickly in the browser
The "server" in this picture is just as likely a cluster of serverless functions

---

![](https://media.giphy.com/media/mgqefqwSbToPe/giphy.gif)

^"Ok, great, thanks Kas, but why do I care?"

---

![](./img/Carina_Nebula.jpg)

# Why does this **matter**?

* Augmenting JS at its not-so-strong points
* Not rewriting entire codebases to use them on the web
* Fewer calls to the server, less latency, faster web apps

^ Fewer calls to the server because Web Assembly lets us do more work in the browser

---

![](./img/Carina_Nebula.jpg)

# **Augmenting JS** at its not-so-strong points

Who wants to write a banking app in JS?

If you're running *anything that relies on mathematical numerical accuracy or speed* that meant, until now, another AJAX call to have another language do alllllllll the math. *With WebAssembly*, we can do this in the browser, with, say, Rust.

---

![](./img/Carina_Nebula.jpg)

# Other JS not-so-strong points

* Type coercion side-effects: `"" == 0 //true`
	* Especially the acciedental concat when you meant to add and vice versa.
* Anything that has to do with types:

```
typeof [] === 'Array' //false...
```

^Yes, I am aware TypeScript exists. There's even a Web Assmebly compiler for it!

---

![](./img/Carina_Nebula.jpg)

## Using WebAssembly means **using the right tool for the job**

---

# BUT THIS WILL KILL JS!!!

![](https://media.giphy.com/media/bldbGnPJiJwli/giphy.gif)

^With all the love in the world I say JS is the cockroach of languages.

---

![](./img/Carina_Nebula.jpg)

# **Probably** not-- for most situations, it **makes JS better by letting it do what it is good at and ignoring the rest**.

However, WASM toolchains are gaining more and more abilities by the day, and some teams would like to have WASM be able to do everything JS does.

** - there are WebAssembly modules that can access the DOM and be used to manipulate the shadow DOM.

^We are waltzing towards a showdown between those who would have wasm do everything and those that would have wasm as augmentation. See me after if you want to learm more.

---

![](./img/Carina_Nebula.jpg)

## It **makes the web better** by **creating better browser experiences**

![inline](https://media.giphy.com/media/SbtWGvMSmJIaV8faS8/giphy.gif)


^Creating faster experience with less latency means we can do more!

---

![](./img/Carina_Nebula.jpg)

# Let's *take a closer look* with a demo

---

![](./img/Carina_Nebula.jpg)

# The **Demo**

* uses wasm-imagemagick
* manipulates images in the browser up to 10x faster than JS can
* Shows the real power of not having to rewrite code and being able to let us use the right tool for the job

---

![](./img/Carina_Nebula.jpg)


# But what about **Node.JS**?

---

![](./img/Carina_Nebula.jpg)

# Wait...

---

# What **ABOUT** Node.JS?!?!

![original](https://media.giphy.com/media/kaq6GnxDlJaBq/giphy.gif)

---
![](./img/Carina_Nebula.jpg)

# Native. Heccin. Modules.

![inline](https://media.giphy.com/media/IYIlvuWc21U4g/giphy.gif)

---
![](./img/Carina_Nebula.jpg)

# Why native modules are such a pain

* They have to be compiled on download for the architecture you're installing on
* They either have to compile on every platform OR leave off platforms from support
* Node-Gyp (disclaimer: I respecc the hecc out of their work.)

^ Native modules are code in other languages that Node interfaces with
^ Right now, when you npm i your native modules, they download and compile the source on your machine

---
![](./img/Carina_Nebula.jpg)

> WebAssembly **Works on Node >= 8.0**

---

![](https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif)

---
![](./img/Carina_Nebula.jpg)

# WebAssembly Modules in Node.JS

* Are *precompiled binaries*, so they're portable to *any platform that runs Node.JS*.
* No more recompilation on every download on every architecture.
* FOR REALS.

^With Web Assembly modules, you're downloading a precompiled binary
^This means much more portability bc it runs wherever Node runs

---
![](./img/Carina_Nebula.jpg)

> "Everyone wants to [deprecate] node-gyp and WebAssembly would [eventually] allow us to do this"
-- Laurie Voss, a few weeks ago

---
![](./img/Carina_Nebula.jpg)

# WebAssembly is even invading serverless

![inline](./img/logo-wordmark-horizontal.png)

---
![](./img/Carina_Nebula.jpg)

# We have a free tier now!

![inline](./img/qr.png)

(I'll show this again later)

---
![](./img/Carina_Nebula.jpg)

# How do we get to this magickal land?

* If you'd like to learn Rust,  you can read the Rust Book and the Rust-wasm book:
* Rust book: <https://doc.rust-lang.org/book/>
* Rust-wasm book: <https://rustwasm.github.io/book/>
* If you'd like to use C/C++, check out <https://emscripten.org>
* C# fan? Try <https://github.com/aspnet/Blazor>
* Fan of some other language? Search the web-- It's probably in the works

^There's even one for PHP...? 

---
![](./img/Carina_Nebula.jpg)

# The point of this talk

* Try WebAssembly (I personally really like Rust)
* WebAssembly is the future of JS in all its forms
* If you are a hiring manager; **hire someone who is different from you**. Just go and do it.

---
![](./img/Carina_Nebula.jpg)

![inline](https://media.giphy.com/media/jndc0TQq9fvK8/giphy.gif)

---
![](./img/Carina_Nebula.jpg)

# Thanks for listening!

![right](./img/qr.png)

![inline](./img/carl-sagan-youre-awesome.gif)

* kas@cloudflare.com
* @nodebotanist
* <https://github.com/nodebotanist/LibertyJS-2019>

^ All inquiries carry some element of risk. There is no guarantee that the universe will conform to our predispositions. But I do not see how we can deal with the universe -- both the outside and inside universe -- without studying it. The best way to avoid abuses is for the populace in general to be scientifically literate, to understand the implications of such investigations. In exchange for freedom of inquiry, scientists are are obliged to  explain their work. If science is considered a closed priesthood, too difficult and arcane for the average persen to understand, the dangers of abuse are greater. But if science is a topic of general interest and concern -- if both its delights and its social consequences are discussed regularly and competently in the schools, the press, and at the dinner table -- we have greatly improved our prospects for learning how the world really is and for improving both it and us."