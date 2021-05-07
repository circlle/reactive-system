import { ReactiveSystem } from "./index"

const reactive = ReactiveSystem({
  data: {
    age: 10,
  },
  computed: {
    bigger5: function () {
      console.log("trigger bigger5");
      return this.$data.age + 5;
    },
  },
  watch: {
    bigger1000: function () {
      return this.$data.age + 1000;
    },
  },
});

console.log(reactive.computed.bigger5);  // 1. trigger bigger5 2. 15
console.log(reactive.watch.bigger1000)   // 1010
reactive.data.age = 20
console.log(reactive.watch.bigger1000);  // 1020
console.log(reactive.computed.bigger5);  // 1. trigger bigger5 2. 25
console.log(reactive.computed.bigger5);  // 25 // from cache