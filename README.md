# Wavy Dot Matrix Thing... With Shaders

This is a small web experiment to create a cool, wavy, interactive particle background for my personal website.

...is what I thought this project was going to be.

Inspired by other websites I had the idea to challenge myself to "Make a personal site background with just plain HTML, CSS, and JS". It became an accidental, multi-day study into shaders and GPU programming in general. This repo is the proud result of that journey.

### The simple days...

This project went through... phases. At first I implemented a simple `.js` program that, based on the size of the screen and a set of parameters, would fill the screen with tiny dots. I added some periodic functions with offsets to create a wavy movement. The implementation was basically to create a `Particle` class that would have attributes, such as base position and velocity. Based on that and on the user's mouse position I would calculate a final force simulating a repulsion effect from the mouse. These particles also had a `draw` method to be displayed in the canvas at their current position at the end of each update call. They would also just be in a big array and each update cycle would read through the array, updating each dot's position and calling `draw`.

The result looked awesome and it was deployed on the first version of my website! The version that had nothing but a "Coming soon" message... and a cool, over the top dynamic wavy dot matrix with repulsion effect :D

To be honest the result was pretty satisfactory and the performance was pretty fine, but something inside me felt uncomfortable on making so many CPU calculations for each single dot on screen. So I thought of using hardware acceleration! After all...

### "How Hard Can It Be?"

After some research I discovered the stregths and limitations of using this tech. For redenring things with a GPU on the browser I would have to use WebGL. I discovered that, to use the GPU to render things in parallel like that, I would have to create my own ✨*shaders*✨. I had heard about shaders before. The thing that devs would go crazy over, that was used a lot in games and that made Minecraft look really nice and fresh! What I didn't know was that I would completely fall in love with them to the point of losing sleep trying to learn more and more.

At first I was afraid of their complexity, so I decided to use a hybrid approach to rendering the particles. Their movement and behavior would still be calculated by the CPU, but their rendering inside the canvas would be offloaded to WebGL. It was actually pretty simple, yet still intriguing and elegant. The idea was, for each frame, bundle all the x and y coordinates into a Float32Array and send that to the GPU. 

For such a simple thing it was incredible how much I learned. Had my first contacts with vertex and fragment shaders, just like their limitations. Also compositing shaders into a program and handling buffers, *where the pain truly lies*. That's also when I had the chance to try different things, like using WebGL to do more than just draw gl.POINTS. I *roughly* replicated Joy Division's famous "Unknow Pleasures" album cover and had a blast in general thinking of all the possibilities of using this new power to do more than drawing triangles and dots in a screen. The result was great, but not that perceptible. I would still have degraded performance by reducing the dot spacing to about 2 or lower. That's when, after a couple of hours playing with one of the most interesting tools I had the pleasure to try in a long time, I decided to try the full GPU rendering mode, by simulating movement and physics using layered shaders.

### The "Full GPU" Rabbit Hole

This immediately brought problems. Shaders are inherently stateless, which would make impossible for me to fully replicate my dots simulation. My over the top simulation had dampening, velocity and force feel. If I chose to follow a "pure" stateless approach I would lose all the details and effects calculated upon previous states. It would work, but it would feel worse, so I set myself to research.

This is where things got painfully more complex. This discovered I needed WebGL2, which game access to Transform Feedback, that lets you "capture" the output of a shader into a specified buffer. Up until this point I was handling a single positions buffer that was simple to set and even simpler to read. All I had to do was to bind this one buffer and use my shader to read it. The lack of a built-in state increased the complexity because it forced me to handle multiple buffers for different informations that would constantly be rewritten. That was the strategy of using Ping-Pong Buffers, where you have two sets of memory (A and B) and you "Read from A, Write to B" on one frame, then "Read from B, Write to A" on the next.

With the new version of WebGL also came new abstractions, like VAOs (Vertex Array Objects), which are like sets of instructions that store a recipe for how to read your buffers. The idea was then to use a VAO to read many different shaders and perform the calculations I need. After that I would "intercept" the results with a Transform Feedback to feed into the buffers of a second VAO that was scheduled to be used on the next frame. On the next frame, I would be able to use the calculations of the past frame to calculate perform the calculations necessary for the next frame and so on. The Ping-Pong analogy is based on the fact that we only need two VAOs to alternate each frame.

Great idea! Difficult execution...

### Debugging a GL_INVALID_OPERATION

This is where the real learning happened. This project is the result of hunting down this bug. I discovered that if you are Writing to a buffer (with Transform Feedback) and Reading from that same buffer (with a VAO) in the same drawArrays call, the GPU (rightfully) does not like it one bit. I spent hours chasing this bug. Checked the animate loop, state array, resize event (also had an issue), shader definitions, everything. I rebuilt the state array. I rebuilt it again. I created new VAOs just for drawing.

Int the end it wasn't in the animate loop at all. It was a state leak in a VAO helper function. It was missing a single, final cleanup line:

```gl.bindBuffer(gl.ARRAY_BUFFER, null);``` 

This one missing line was leaving a "tool" on the "workbench", which caused the entire pipeline to fail.

This project accidentally taught me the entire stack of modern GPGPU (General-Purpose GPU programming).

- Shaders aren't just for drawing: They are tiny, massively parallel programs for math.

- The Pipeline: The difference between a Vertex Shader (calculating position) and a Fragment Shader (calculating color).

- GPGPU: How to run stateful physics (with velocity, damping, etc.) entirely on the GPU using Transform Feedback.

- WebGL State: The GPU is a "state machine." You have to be obsessively clean. You must "unbind" everything you "bind" (bindBuffer(null), bindVertexArray(null)) or you will get "state leaks" that cause impossible-to-debug errors.

### How to Run It

This project uses fetch() to load the .glsl shader files, so you can't just open index.html from your file system (it'll fail with a CORS error).

You need to run it from a local server. The easiest way:

1. Clone this repo.

1. cd into the folder.

1. Run a simple web server. If you have Node.js, just run:

  ```npx http-server```

4. Open your browser to http://localhost:8080.

### Final Thoughts

This was many times harder than I thought it would be, but also many times more interesting. The result is a new porfolio project that has more than meets the eye, a sick website and much more knowledge I could ever hope to get when I set myself to *optimize this background rendering*.

10/10, would recommend the pain.
