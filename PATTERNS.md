# Bundled Patterns

Railsmith bundles patterns from [`jefking/cloud-patterns`](https://github.com/jefking/cloud-patterns) and [`jefking/design-patterns`](https://github.com/jefking/design-patterns). Use `npx railsmith learn <pattern-id>` to read the complete guidance for any pattern.

## Cloud Patterns

| Pattern ID | Title | Intent |
| --- | --- | --- |
| `cloud:ambassador` | Ambassador Pattern | Create a colocated helper service or proxy that sends outbound network requests on behalf of a consumer application. |
| `cloud:anti-corruption-layer` | Anti-Corruption Layer Pattern | Protect a clean domain model from a legacy, external, or incompatible model by translating at an explicit boundary. |
| `cloud:asynchronous-request-reply` | Asynchronous Request-Reply Pattern | Accept a request quickly, process it asynchronously, and let the caller monitor status until a final result is available. |
| `cloud:backends-for-frontends` | Backends for Frontends Pattern | Create backend services dedicated to specific frontend experiences so each client gets an API shaped for its needs. |
| `cloud:bulkhead` | Bulkhead Pattern | Isolate workload elements into separate resource pools so failure or saturation in one pool does not exhaust the rest. |
| `cloud:cache-aside` | Cache-Aside Pattern | Let application code populate a cache on demand from an authoritative data store and use it for later reads. |
| `cloud:choreography` | Choreography Pattern | Coordinate a business process through events and local service reactions rather than a central orchestrator. |
| `cloud:circuit-breaker` | Circuit Breaker Pattern | Stop repeated calls to a failing remote dependency, fail fast while it is unhealthy, and probe for recovery. |
| `cloud:claim-check` | Claim Check Pattern | Store a large or protected payload outside the message bus and send only a small reference through messaging. |
| `cloud:compensating-transaction` | Compensating Transaction Pattern | Recover from a failed eventually consistent multi-step operation by applying explicit compensating actions. |
| `cloud:competing-consumers` | Competing Consumers Pattern | Run multiple interchangeable consumers against one work channel so each message is processed by one consumer while throughput scales out. |
| `cloud:compute-resource-consolidation` | Compute Resource Consolidation Pattern | Run compatible tasks in a shared compute unit to improve utilization, reduce overhead, or simplify operations. |
| `cloud:cqrs` | CQRS Pattern | Separate read operations from write operations with distinct models, interfaces, and scaling or consistency choices. |
| `cloud:deployment-stamps` | Deployment Stamps Pattern | Deploy multiple repeatable, independent copies of application components as scale units, regions, or tenant cells. |
| `cloud:event-sourcing` | Event Sourcing Pattern | Store state changes as an immutable append-only stream of domain events and derive current state from that stream. |
| `cloud:external-configuration-store` | External Configuration Store Pattern | Move configuration out of the application deployment package into a managed external source. |
| `cloud:federated-identity` | Federated Identity Pattern | Delegate authentication to an external identity provider and use validated claims for local authorization decisions. |
| `cloud:gateway-aggregation` | Gateway Aggregation Pattern | Use a gateway endpoint to call multiple backend services and return one client-oriented aggregated response. |
| `cloud:gateway-offloading` | Gateway Offloading Pattern | Move shared edge concerns to a gateway so backend services do not duplicate specialized request processing. |
| `cloud:gateway-routing` | Gateway Routing Pattern | Expose one client endpoint and route requests to multiple backend services by path, host, version, tenant, or policy. |
| `cloud:geode` | Geode Pattern | Run active workload nodes across multiple geographies so any region can serve client requests. |
| `cloud:health-endpoint-monitoring` | Health Endpoint Monitoring Pattern | Expose endpoints that monitoring and automation can use to determine whether a workload is live, ready, and functioning. |
| `cloud:index-table` | Index Table Pattern | Create and maintain secondary lookup structures for query patterns that the primary data store cannot serve efficiently. |
| `cloud:leader-election` | Leader Election Pattern | Elect exactly one active coordinator among distributed instances for leader-only work. |
| `cloud:materialized-view` | Materialized View Pattern | Maintain a precomputed read model over one or more source stores for queries that are expensive or awkward against source data. |
| `cloud:messaging-bridge` | Messaging Bridge Pattern | Connect otherwise incompatible messaging systems while preserving message intent and delivery semantics as far as possible. |
| `cloud:pipes-and-filters` | Pipes and Filters Pattern | Break complex processing into independent filters connected by pipes with explicit input and output contracts. |
| `cloud:priority-queue` | Priority Queue Pattern | Process higher-priority queued work before lower-priority work while preserving fairness rules the business requires. |
| `cloud:publisher-subscriber` | Publisher-Subscriber Pattern | Let publishers announce events asynchronously to multiple independent subscribers without knowing who receives them. |
| `cloud:quarantine` | Quarantine Pattern | Keep external assets isolated until they pass validation, scanning, approval, or quality gates. |
| `cloud:queue-based-load-leveling` | Queue-Based Load Leveling Pattern | Place a queue between producers and consumers so bursts are buffered and downstream processing happens at a sustainable rate. |
| `cloud:rate-limiting` | Rate Limiting Pattern | Control the rate at which a workload consumes a constrained dependency to avoid provider throttling, quota exhaustion, or retry storms. |
| `cloud:retry` | Retry Pattern | Retry operations that fail because of anticipated transient faults, using bounded and delay-aware policies. |
| `cloud:saga` | Saga Pattern | Manage consistency for a distributed business transaction through a sequence of local transactions and compensations. |
| `cloud:scheduler-agent-supervisor` | Scheduler Agent Supervisor Pattern | Coordinate distributed actions through a scheduler, worker agents, and a supervisor that monitors and recovers progress. |
| `cloud:sequential-convoy` | Sequential Convoy Pattern | Process related messages in order for each group while allowing unrelated groups to proceed concurrently. |
| `cloud:sharding` | Sharding Pattern | Horizontally partition data across shards and route requests to the shard that owns the relevant data. |
| `cloud:sidecar` | Sidecar Pattern | Deploy a helper component beside an application process or container to provide supporting capabilities without embedding them in the app. |
| `cloud:static-content-hosting` | Static Content Hosting Pattern | Serve static assets directly from storage or CDN infrastructure instead of application compute. |
| `cloud:strangler-fig` | Strangler Fig Pattern | Incrementally replace a legacy system by routing selected capabilities to new implementations while both coexist. |
| `cloud:throttling` | Throttling Pattern | Protect a service or resource by limiting the rate, concurrency, or volume of incoming consumption. |
| `cloud:valet-key` | Valet Key Pattern | Issue a scoped, time-limited credential so a client can access a specific resource directly without broad service credentials. |

## Design Patterns

| Pattern ID | Title | Intent |
| --- | --- | --- |
| `design:behavioral/blackboard` | Blackboard Pattern | Coordinate multiple specialized contributors through a shared blackboard where partial results are posted, inspected, and refined until a solution emerges. |
| `design:behavioral/chain-of-responsibility` | Chain of Responsibility Pattern | Pass a request along a chain of handlers so each handler can process it, delegate it, or stop propagation without clients knowing the final receiver. |
| `design:behavioral/command` | Command Pattern | Encapsulate an action and its inputs as an object so invocation can be decoupled from the code that performs the work. |
| `design:behavioral/fluent-interface` | Fluent Interface Pattern | Design an API whose calls chain in a readable sequence, often resembling a small domain-specific language. |
| `design:behavioral/interpreter` | Interpreter Pattern | Represent grammar rules as structures and interpret sentences by evaluating that representation against a context. |
| `design:behavioral/iterator` | Iterator Pattern | Provide sequential access to elements while hiding traversal mechanics and the underlying data structure. |
| `design:behavioral/mediator` | Mediator Pattern | Centralize coordination between colleagues so they do not depend on each other directly. |
| `design:behavioral/memento` | Memento Pattern | Capture and restore an object's state through opaque snapshots managed outside the object. |
| `design:behavioral/null-object` | Null Object Pattern | Replace null checks with an object that implements the same contract and performs neutral behavior. |
| `design:behavioral/observer` | Observer Pattern | Let a subject notify interested observers about events or state changes through a subscription contract. |
| `design:behavioral/servant` | Servant Pattern | Place shared operations in a helper object that acts on serviced objects through a narrow contract. |
| `design:behavioral/specification` | Specification Pattern | Encapsulate a rule as an object or function that can test candidates and combine with other rules using boolean logic. |
| `design:behavioral/state` | State Pattern | Represent state-specific behavior in separate state objects so the context can delegate behavior and transitions cleanly. |
| `design:behavioral/strategy` | Strategy Pattern | Encapsulate alternative algorithms behind a common interface so the context can delegate without knowing concrete strategy details. |
| `design:behavioral/template-method` | Template Method Pattern | Define the fixed sequence of an algorithm in a base type and let subclasses customize specific steps. |
| `design:behavioral/visitor` | Visitor Pattern | Move operations over an object structure into visitor objects while letting element classes dispatch to the correct visitor method. |
| `design:concurrency/active-object` | Active Object Pattern | Turn calls into queued requests so a scheduler can execute them asynchronously inside the active object's own control context. |
| `design:concurrency/balking` | Balking Pattern | Check state before acting and abandon the operation when preconditions are not satisfied. |
| `design:concurrency/binding-properties` | Binding Properties Pattern | Bind properties so a change in one object updates or constrains related properties elsewhere. |
| `design:concurrency/compute-kernel` | Compute Kernel Pattern | Express a small computation that can be applied across many indexed work items, often on SIMD, GPU, or parallel CPU execution. |
| `design:concurrency/cpu-atomic-operation` | CPU Atomic Operation Pattern | Use hardware or runtime atomic operations to perform indivisible reads, writes, or read-modify-write updates on shared values. |
| `design:concurrency/double-checked-locking` | Double-Checked Locking Pattern | Avoid repeated lock acquisition by checking initialization state before and after acquiring a lock. |
| `design:concurrency/event-based-asynchronous` | Event-Based Asynchronous Pattern | Expose asynchronous operations through event notifications so callers can react without blocking the initiating thread. |
| `design:concurrency/guarded-suspension` | Guarded Suspension Pattern | Suspend execution while a guarded precondition is false, then resume when another thread or task signals that the condition may be satisfied. |
| `design:concurrency/join` | Join Pattern | Wait for or react to a defined combination of asynchronous events before running the next action. |
| `design:concurrency/lock` | Lock Pattern | Serialize access to a critical section so concurrent operations cannot corrupt shared state. |
| `design:concurrency/messaging-design-pattern` | Messaging Design Pattern | Decouple senders and receivers through message contracts, channels, routing, and delivery semantics. |
| `design:concurrency/monitor-object` | Monitor Object Pattern | Protect an object's internal state by making its methods mutually exclusive and coordinating wait conditions inside the object. |
| `design:concurrency/reactor` | Reactor Pattern | Wait for events from handles or resources, demultiplex readiness, and dispatch handlers without dedicating one thread per connection. |
| `design:concurrency/read-write-lock` | Read-Write Lock Pattern | Allow concurrent reads of shared state while serializing writes and excluding readers during mutation. |
| `design:concurrency/safe-concurrency-with-exclusive-ownership` | Safe Concurrency With Exclusive Ownership Pattern | Avoid runtime locking by structuring ownership so mutable state is accessed exclusively or shared only immutably. |
| `design:concurrency/scheduler` | Scheduler Pattern | Decide when queued work runs and which worker, thread, task, or time slot should execute it. |
| `design:concurrency/service-handler` | Service Handler Pattern | Accept incoming requests and assign each connection, session, or request to a handler responsible for its protocol interaction. |
| `design:concurrency/thread-pool` | Thread Pool Pattern | Reuse worker threads to execute queued tasks while limiting concurrency and thread creation overhead. |
| `design:concurrency/thread-specific-storage` | Thread-Specific Storage Pattern | Provide data that is global in access shape but isolated per thread of execution. |
| `design:creational/abstract-factory` | Abstract Factory Pattern | Create families of related products through one factory contract so the selected family stays consistent across the application flow. |
| `design:creational/builder` | Builder Pattern | Separate complex construction from the final object so callers can assemble a valid result step by step without knowing every construction detail. |
| `design:creational/dependency-injection` | Dependency Injection Pattern | Supply required dependencies through explicit inputs so construction, lifetime, and replacement are controlled at a composition boundary. |
| `design:creational/factory-method` | Factory Method Pattern | Create products through a creator operation so clients depend on a product contract instead of concrete product classes. |
| `design:creational/lazy-initialization` | Lazy Initialization Pattern | Defer creation of an object, resource, or computed value until the first time it is needed. |
| `design:creational/multiton` | Multiton Pattern | Provide controlled access to a limited set of named instances while preventing accidental duplicate instances for the same key. |
| `design:creational/object-pool` | Object Pool Pattern | Reuse a managed set of objects or resources instead of repeatedly creating and destroying them. |
| `design:creational/prototype` | Prototype Pattern | Create new objects by copying existing prototype instances while preserving the parts of their configuration that should carry forward. |
| `design:creational/resource-acquisition-is-initialization` | Resource Acquisition Is Initialization Pattern | Acquire a resource during initialization and release it automatically when the owning object or scope ends. |
| `design:creational/singleton` | Singleton Pattern | Ensure one accessible instance of a component when the domain or runtime truly requires one shared coordinator. |
| `design:structural/adapter` | Adapter Pattern | Wrap an incompatible object so clients can use it through the interface they already expect. |
| `design:structural/bridge` | Bridge Pattern | Separate an abstraction from its implementation so each side can evolve without creating a subclass combination for every variant. |
| `design:structural/composite` | Composite Pattern | Represent tree structures so clients can work uniformly with leaves and containers. |
| `design:structural/decorator` | Decorator Pattern | Add responsibilities to an object dynamically while preserving the same client interface. |
| `design:structural/delegation` | Delegation Pattern | Extend or vary behavior by forwarding work to a delegate object through a clear collaboration contract. |
| `design:structural/extension-object` | Extension Object Pattern | Attach optional extension interfaces to objects so clients can discover and use capabilities without changing the core object hierarchy. |
| `design:structural/facade` | Facade Pattern | Provide a higher-level entry point that coordinates subsystem objects behind a clear API. |
| `design:structural/flyweight` | Flyweight Pattern | Reduce memory or object-creation cost by sharing common immutable state and supplying context-specific extrinsic state at use time. |
| `design:structural/front-controller` | Front Controller Pattern | Route incoming requests through one controller boundary that owns common preprocessing, routing, security, and dispatch concerns. |
| `design:structural/marker` | Marker Pattern | Use an empty interface, annotation, attribute, tag, or equivalent marker to identify objects with a meaningful capability or classification. |
| `design:structural/module` | Module Pattern | Organize related code into one cohesive namespace or unit with an explicit public surface and hidden implementation details. |
| `design:structural/proxy` | Proxy Pattern | Stand in for a real subject to add access control, lazy loading, remote access, caching, logging, rate limiting, or other access behavior while preserving the subject contract. |
| `design:structural/twin` | Twin Pattern | Represent one conceptual entity as two tightly linked objects so each can participate in a different hierarchy or framework role. |
