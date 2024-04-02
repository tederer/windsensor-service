FROM node:20.12.0-alpine3.19

WORKDIR /usr/src/app

COPY package.json .
RUN npm --production install
COPY ./src ./src/
COPY ./startService.sh .

EXPOSE 80

ENTRYPOINT ["./startService.sh"]
