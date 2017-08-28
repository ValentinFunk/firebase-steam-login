FROM node:8-alpine

RUN mkdir -p /usr/src/app/dist
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
COPY yarn.lock /usr/src/app
RUN yarn install --prod && yarn cache clean --force
ADD dist /usr/src/app/dist

CMD [ "npm", "start" ]