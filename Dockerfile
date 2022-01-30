FROM node:17.4.0
RUN mkdir -p /usr/src/bot
WORKDIR /usr/src/bot
COPY . /usr/src/bot
RUN npm install
CMD ["npm", "start"]