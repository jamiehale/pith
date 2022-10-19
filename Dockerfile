FROM node:18

RUN mkdir /usr/bin/app
WORKDIR /usr/bin/app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

RUN yarn 

ENV PITH_ROOT=/pith

CMD [ "yarn", "build" ]
