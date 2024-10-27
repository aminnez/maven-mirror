ARG NODE_VERSION=22.6
ARG ALPINE_VERSION=3.20

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION}

# install and use yarn 4.x
RUN corepack prepare yarn@4.3.1

# Run as a root user.
USER root

RUN mkdir -p /home/app
RUN chown -R node:node /home/app

# Set working directory
WORKDIR /home/app

# Run the application as a non-root user.
USER node

# Copy the rest of the source files into the image.
COPY --chown=node . .

# Install packages
RUN yarn workspaces focus --production && yarn cache clean

# Expose the port that the application listens on.
EXPOSE 9443

# Run the application.
ENTRYPOINT ["yarn", "run", "pm2", "start", "--attach", "--env", "production"]