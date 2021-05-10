  
# First, specify the base Docker image. You can read more about
# the available images at https://sdk.apify.com/docs/guides/docker-images
# You can also use any other image from Docker Hub.
FROM apify/actor-node-chrome

# Second, copy just package.json and package-lock.json since those are the only
# files that affect "npm install" in the next step, to speed up the build.
COPY package*.json ./

# Install NPM packages, skip optional and development dependencies to
# keep the image small. Avoid logging too much and print the dependency
# tree for debugging
RUN npm --quiet set progress=false \
  && npm install --only=prod --no-optional \
  && echo "Installed NPM packages:" \
  && (npm list || true) \
  && echo "Node.js version:" \
  && node --version \
  && echo "NPM version:" \
  && npm --version 
 

# Next, copy the remaining files and directories with the source code.
# Since we do this after NPM install, quick build will be really fast
# for most source file changes.
COPY . ./

# Install puppeteer so it's available in the container.

CMD npm start

