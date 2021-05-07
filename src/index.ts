export type ComputedFunction<D> = (this: { $data: D }) => any;
export type WatchFunction<D> = (this: { $data: D }) => any;
export type Computed<D> = Record<string, ComputedFunction<D>>;

export type ReactiveSystemOptions<D, C, W> = {
  data: D;
  computed: C;
  watch: W;
};
const ReactiveSystem = <
  D extends object,
  C extends { [key: string]: ComputedFunction<D> },
  W extends { [key: string]: WatchFunction<D> }
>(
  options: ReactiveSystemOptions<D, C, W>
) => {
  const data = options.data;
  const watch = options.watch;
  const computed = options.computed;

  /**
   * flag and switch for collect computed property
   * 1. when start deal computed property: set doing to true
   * 2. when deal specific property, set perperty to property name
   * 3. In getter of dataProxy
   *    - if switch is open, consider the trigger is from computed, then add current computed property to the dependent list of this data property
   * 4. In setter of dataProxy, if one computed property depend on this data property, then update the cache of computed property
   */
  const dealComputedRef: { doing: boolean; property: string } = {
    doing: false,
    property: "",
  };

  /**
   * cached computed values, read from computed proxy
   */
  const cachedComputedValues: Record<string, any> = {};

  // store the property in computed who depend on the record key
  const dataProxyRef: Record<string, { dependentBy: string[] }> = {};
  const dataProxy = new Proxy(data, {
    get: function (obj, prop) {
      // 如果 computed 收集阶段还没结束
      if (!Object.isFrozen(dealComputedRef)) {
        if (dealComputedRef.doing) {
          if (dataProxyRef[prop as string]) {
            dataProxyRef[prop as string].dependentBy.push(
              dealComputedRef.property
            );
          } else {
            dataProxyRef[prop as string] = {
              dependentBy: [dealComputedRef.property],
            };
          }
        }
      }
      return Reflect.get(obj, prop);
    },
    set: function (obj, prop, value) {
      const result = Reflect.set(obj, prop, value);
      if (obj.hasOwnProperty(prop)) {
        if (computed) {
          dataProxyRef[prop as string].dependentBy.forEach((key) => {
            if (!computed[key]) return;

            cachedComputedValues[key] = computed[key].call({
              $data: dataProxy,
            });
          });
        }
        if (watch) {
          Object.entries(watch).forEach(([key, value]) => {
            if (key === prop) {
              value.call({ $data: dataProxy });
            }
          });
        }
      }
      return result;
    },
  });

  // ! computed
  dealComputedRef.doing = true;
  Object.entries(computed).forEach(([key, value]) => {
    dealComputedRef.property = key;
    cachedComputedValues[key] = value.call({ $data: dataProxy });
  });
  dealComputedRef.doing = false;
  Object.freeze(dealComputedRef);
  const computedProxy = new Proxy(computed, {
    get: function (obj, prop) {
      if (prop in obj) {
        return cachedComputedValues[prop as string];
      }
    },
  });

  // ! watch
  const watchProxy = new Proxy(watch, {
    get: function (obj, prop) {
      if (prop in obj) {
        return obj[prop as string].call({ $data: dataProxy });
      }
    },
  });

  return {
    data: dataProxy,
    computed: computedProxy,
    watch: watchProxy,
  };
};

export { ReactiveSystem }
