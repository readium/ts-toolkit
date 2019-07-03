# Project Goals

The Readium Web project defines a toolkit to build apps (not a full featured app itself) based on the Readium Architecture.

For integration testing and demonstration, the project (as reference implementation) is to be developed as an application itself.

Emphasis is on design efficiency, modularization, and code clarity. 
With the aim to achieve ease of maintenance and lower the barrier to entry for collaboration. 
Simplified approaches with the least effort and resistance to be prioritized.

The project is rationalized by the large number of organizations looking at Readium or working with Readium with the intent to develop very similar publication viewer applications. 

The philosophy is to get things done right, and do things well. To achieve long-term viability and for the result in a compelling product.

## Lightweight but scalable
- Core functionality included, common to all publication viewers
- Foundation and framework for more advanced features

## Modular and expandable

- Well-defined interfaces and APIs
- Basic implementations swappable for full-fledged replacements

## Efficient and high-performing
- Lean and pragmatic
- Follows best practices
- Focus on performance and speed

## Easy to configure, remix capable

- Centralized, well-defined configuration
- Customization for key features (branding, etc)

## Conforms to Readium Architecture

- Allows processing of Readium Web Publications
- Effective usage of Readium shared modules
- Usable with or without Readium Publication Servers

## Minimal UI, decoupled, and expandable

- Component based
- Implementation agnostic
- Ability to change theme and look and feel

## Developers can add new functionality

- Without refactoring
- Counter the "forking into divergence" approach

## Efficient in cross-browser, cross-device

- Progressive Web App
- Modern day browser support
- Responsive and adaptive to device classes
- Low-memory device considerations

## Optimized development workflow

- Integrate with modern-day tools
- Modern build system
- Provide a first-class developer experience
- Testing / Continuous Integration

## Web security and offline awareness

- Limit the obstacles for offline capabilities
- Low connectivity considerations
- HTTPS, CORS, CSP and other web security concerns

## Localization, Internationalization, Accessibility

- Localized strings
- RTL support
- WCAG (AA+) accessibility compliance

## Quality content presentation

- Clean presentation of content and typography
- Thoughtful reading experience
- Use Readium CSS as a baseline
- Consistent text/page flow and breaks
- Supersede print edition, don't regress

## Sensible content protection

- Handle protected publications
- Access control support
- Apply realistic protection schemes
