FROM node:10-alpine
WORKDIR /usr/src/app
ENV NODE_ENV production
COPY node_modules ./node_modules
COPY ./ ./
CMD ["node", "--expose-gc", "./index.js"]