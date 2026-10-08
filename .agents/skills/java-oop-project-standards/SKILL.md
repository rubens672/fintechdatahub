---
name: java-oop-project-standards
description: Enforces strict Object-Oriented Programming (OOP) paradigms, proportional comprehensive Javadoc documentation, mandatory corporate license headers, and enterprise architectural patterns for all Java projects. Use when creating new Java projects, designing classes, refactoring Java code, or implementing new Java modules.
---

# Java OOP Project Standards & Craftsmanship

## Overview

This skill establishes the definitive engineering standard for creating and maintaining Java projects within the organization. Every Java artifact produced must strictly adhere to the fundamental tenets of Object-Oriented Programming (OOP), SOLID design principles, clean domain modeling, exhaustive and proportional Javadoc documentation, and the mandatory corporate license header.

---

## 1. Mandatory Corporate License Header

**Every single Java source file (`.java`)** must begin at line 1, before the `package` declaration and any imports, with the following exact corporate license header:

```java
/*
 * Copyright (c) 2026 Berti AI & Cloud Architecture. All rights reserved.
 */
```

### Formatting Rules:
- No empty lines before the opening `/*`.
- Exactly one blank line between the closing `*/` and the `package` statement.
- Applies to all Java source files: classes, interfaces, records, enums, annotations, and package-info files.

---

## 2. Proportional Javadoc Documentation Standard

Documentation is a first-class engineering deliverable. Every class, interface, record, enum, method, and constructor must be documented. The depth and extent of the documentation must be **strictly proportional to the architectural importance of the component**.

### The Rule of Proportionality (Tier System)

```
+-------------------------------------------------------------------------+
| Tier 1: Core Architecture, Domain Engine, Business Services, Clients   |
| -> Comprehensive, multi-paragraph architectural Javadoc                 |
| -> Responsibilities, Concurrency model, Invariants, {@code} Example     |
+-------------------------------------------------------------------------+
                                    |
+-------------------------------------------------------------------------+
| Tier 2: Domain Entities, Value Objects, Configs, DTOs, Mappers          |
| -> Clear, structured Javadoc explaining domain role and semantics      |
+-------------------------------------------------------------------------+
                                    |
+-------------------------------------------------------------------------+
| Tier 3: Internal Helpers, Exception Types, Low-Level Utilities          |
| -> Focused, precise Javadoc detailing function and edge-case contracts  |
+-------------------------------------------------------------------------+
```

#### Tier 1: Core Architectural Components (Services, Engines, API Clients, Core Coordinators)
*The more critical the class, the more extensive, rigorous, and complete the Javadoc must be.*
- **Overview & Architectural Role**: What is this component's exact role in the system architecture?
- **Domain Responsibilities**: What business capabilities does it orchestrate?
- **Concurrency & Thread Safety**: Is it thread-safe? Does it use virtual threads, locks, or immutability?
- **Invariants & Lifecycle**: What invariants must hold true before and after invocations?
- **Usage Example**: A functional code snippet wrapped in `<pre>{@code ...}</pre>`.
- **Failure Modes & Resilience**: Rate limiting, retry semantics, fallback strategies, and exception boundaries.
- **Cross-References**: Relevant `@see` tags pointing to collaborating contracts and models.

#### Tier 2: Domain Entities, Value Objects, DTOs, Configuration
- Clear description of what real-world or system concept is represented.
- Explicit definition of immutability guarantees.
- Validation rules enforced during construction.
- Field-level Javadoc for every attribute.

#### Tier 3: Utilities, Custom Exceptions, Internal Helpers
- Focused Javadoc stating exact behavior, boundary handling, and null-safety expectations.

### Method and Function-Level Documentation for Principal Classes
Every public, protected, and package-private method—especially in Tier 1 and Tier 2 principal classes—must possess an exhaustive, structured Javadoc contract covering the following mandatory sections:

1. **Operational Intent & Business Context**:
   - What business capability or algorithmic calculation does this method perform?
   - Why is this operation required within the overarching quantitative workflow?
2. **Step-by-Step Algorithmic Logic & Business Rules**:
   - Enumerate the explicit operational steps executed internally (e.g. 1. Input sanitization, 2. Dynamic threshold calculation, 3. Dispatch to broker, 4. Receipt persistence).
   - Document any mathematical formulas (e.g. Stop Loss positioning `entry - (multiplier * ATR_14)`, Equal-Dollar Risk Parity sizing).
3. **Explicit Side Effects & External Interactions**:
   - Network interactions: Calls to external broker APIs (eToro Public API), microservices, or cloud endpoints.
   - Persistence mutations: Writes, updates, or deletions in Firestore, PostgreSQL, or transactional databases.
   - Cache state changes: Updates or invalidations of in-memory Caffeine/RAM caches.
4. **Concurrency, Thread-Safety & Execution Context**:
   - Is the method non-blocking or blocking?
   - Is it safe for concurrent invocation from multiple threads or Project Loom Virtual Threads?
   - Does it hold locks, manage atomic references, or operate on thread-local state?
5. **Contractual Parameter Specifications (`@param`)**:
   - For *every* argument: semantic business meaning, expected data format/unit (e.g. USD, basis points, shares), accepted mathematical bounds (e.g. `> 0`, `[3.5%, 9.0%]`), and nullability guarantee (must be explicitly documented with `@NonNull` or checked).
6. **Contractual Return Specifications (`@return`)**:
   - Meaning of the returned object or composite result.
   - Semantics of boundary conditions (e.g. when an empty `Optional`, empty collection, or neutral status is returned).
7. **Comprehensive Error & Exception Contracts (`@throws`)**:
   - List *every* thrown checked exception and meaningful runtime exception (`IllegalArgumentException`, `IllegalStateException`, `BrokerApiException`, `InsufficientFundsException`).
   - Specify the precise triggering condition and actionable guidance for the caller.
8. **In-line Explanatory Comments**:
   - Within the method body, annotate non-obvious branching, defensive checks, mathematical calculations, and broker quirks with clear in-line comments explaining the *rationale* behind the code.

---

## 3. Strict Object-Oriented Programming (OOP) Paradigms

Never write procedural scripts disguised as Java classes. Strictly enforce the four pillars of OOP and SOLID principles:

### Pillar I: Encapsulation & Information Hiding
1. **Private by Default**: All fields must be `private` (or `private final`). Never expose public or package-private mutable fields.
2. **Tell, Don't Ask**: Do not pull data out of an object to make a decision and then set data back in. Tell the object what operation to perform; let the object manage its own state and invariants.
3. **Immutability by Default**:
   - Prefer Java `record` for immutable data carriers and Value Objects.
   - Use `final` for class fields and local variables where possible.
   - Perform defensive copies in constructors and getters when accepting or returning mutable collections or date types (`List.copyOf()`, `Collections.unmodifiableMap()`).
4. **Law of Demeter (Principle of Least Knowledge)**:
   - A method of an object should only call methods on itself, its parameters, objects it creates, or its direct component dependencies.
   - Avoid chains like `order.getCustomer().getAddress().getCity().toLowerCase()`.

### Pillar II: Abstraction & Contract-First Design
1. **Program to Interfaces**: High-level modules and consumers must depend on abstractions (interfaces), never concrete implementations (`OrderRepository`, not `SqlOrderRepository`).
2. **Stable Contracts**: Design interfaces that are hard to misuse and easy to implement.
3. **No Leaky Abstractions**: Never leak infrastructure details (e.g. SQL exceptions, HTTP status codes) into domain interface contracts.

### Pillar III: Inheritance vs. Composition
1. **Favor Composition Over Inheritance**: Use inheritance (`extends`) only when an authentic "is-a" relationship exists and Liskov Substitution is 100% satisfied.
2. **Final Classes**: Design for inheritance or forbid it. Mark concrete classes `final` unless explicitly designed to be extended.
3. **Strategy & Decorator Patterns**: Use composition and delegation to augment behavior dynamically rather than deep inheritance hierarchies.

### Pillar IV: Polymorphism & Eliminating Conditional Logic
1. **Replace Type Codes and Conditionals with Polymorphism**:
   - Never use `switch (type)` or chains of `if (obj instanceof X)` to branch business logic.
   - Use polymorphism: define a common interface method or Strategy pattern and let each subtype execute its specialized behavior.

---

## 4. SOLID Design Principles Checklist

| Principle | Enforcement in Java | Red Flag to Avoid |
| :--- | :--- | :--- |
| **S** - Single Responsibility | One class = One cohesive responsibility. Split classes that exceed 300-400 lines into cohesive collaborators. | God classes (`Manager`, `Handler`, `Processor`) doing I/O, validation, and calculation. |
| **O** - Open/Closed | Open for extension (via interfaces, strategies, plugins), closed for modification. | Modifying existing business services to add a new asset type or payment provider. |
| **L** - Liskov Substitution | Subclasses/implementations must fulfill all pre-conditions and post-conditions of the base type without surprises. | Overriding a method to throw `UnsupportedOperationException` or silently ignoring arguments. |
| **I** - Interface Segregation | Granular, client-specific interfaces. Multiple focused interfaces are better than one general-purpose interface. | Fat interfaces forcing classes to implement dummy or empty methods. |
| **D** - Dependency Inversion | High-level modules depend on abstractions. Low-level modules depend on abstractions. Inject dependencies via constructor. | Hardcoded `new ConcreteService()` inside domain logic or static singletons. |

---

## 5. Domain-Driven Design (DDD) & Clean Architecture Patterns

When scaffolding or structuring a project, organize packages by domain or architectural layer:

```
src/main/java/com/company/project/
├── domain/                      # Pure Business Domain (Zero external dependencies)
│   ├── model/                  # Entities, Value Objects (records), Enums
│   ├── repository/             # Repository interfaces (contracts)
│   └── service/                # Core domain business logic and calculations
├── application/                 # Application Services / Use Cases
│   ├── port/in/                # Incoming use case interfaces
│   ├── port/out/               # Outgoing SPI / port interfaces
│   └── service/                # Application orchestration services
├── infrastructure/              # Adapters, External Integrations & Storage
│   ├── persistence/            # DB entities, JPA/Firestore repository adapters
│   ├── client/                 # External REST/gRPC HTTP clients (e.g. WebClient)
│   └── config/                 # Spring / DI framework configuration classes
└── web/                         # Controllers, REST endpoints, DTOs, Mappers
```

---

## 6. Null-Safety and Error Handling

1. **Zero Raw Nulls**:
   - Never return `null` from any method. Return `Optional<T>` for optional query results, or empty collections (`Collections.emptyList()`, `Set.of()`).
   - Validate constructor parameters with `Objects.requireNonNull(arg, "arg must not be null")` or `@NonNull`.
2. **Semantic Domain Exceptions**:
   - Create a clean hierarchy of typed domain exceptions rooted in a base unchecked exception (e.g., `DomainException extends RuntimeException`).
   - Never catch or suppress generic `Exception` or `Throwable`.
   - Never swallow exceptions with empty `catch` blocks or `e.printStackTrace()`. Always log with contextual structured logging (`org.slf4j.Logger`).

---

## 7. Step-by-Step Project Creation Workflow

When requested to create a Java project, module, or class:

1. **Phase 1 - Domain Modeling & Contract Definition**:
   - Define the domain entities, Value Objects, and interface contracts first.
   - Enforce immutable Value Objects with Java records or private final fields.
2. **Phase 2 - Source File Scaffolding with License Header**:
   - Add the exact corporate license header to line 1 of every `.java` file.
   - Add the package declaration and imports.
3. **Phase 3 - Proportional Javadoc Authoring**:
   - Assess the architectural tier of the component.
   - For Tier 1 components, author an extensive, comprehensive Javadoc block including architecture role, thread-safety, invariants, and code usage examples.
   - For all methods, write full Javadoc with `@param`, `@return`, `@throws`.
4. **Phase 4 - Implementation with Strict OOP**:
   - Apply constructor dependency injection.
   - Guard against invalid state with pre-condition checks.
   - Implement business logic obeying Tell Don't Ask and Law of Demeter.
5. **Phase 5 - Comprehensive Unit Testing**:
   - Create test classes in `src/test/java/` verifying invariants, edge cases, and failure modes using JUnit 5 and AssertJ/Mockito.

---

## 8. Templates & Reference Files

Refer to the included resource templates and guides for complete code patterns:
- [Corporate Class Template](./resources/templates/CorporateClassTemplate.java)
- [Corporate Interface Template](./resources/templates/CorporateInterfaceTemplate.java)
- [Corporate Value Object Template](./resources/templates/CorporateValueObjectTemplate.java)
- [Detailed OOP Paradigms Guide](./references/oop-paradigms.md)
- [Detailed Javadoc Standards Guide](./references/javadoc-standards.md)
