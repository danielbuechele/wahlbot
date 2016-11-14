FROM node:7
RUN npm install --global yarn
WORKDIR /app
ADD package.json yarn.lock /app/
RUN unset NODE_ENV; yarn install
ADD . /app/
CMD yarn start
