FROM node:7.2.1
EXPOSE 4000

ENV NODE_ENV $NODE_ENV

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY . /usr/src/app
RUN npm install --unsafe-perm && npm cache clean

CMD [ "npm", "start" ]

