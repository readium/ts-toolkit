# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2024-11-22

### Fixed

- Export of `Resource` and `services` folder was missing in build, preventing usage of `Resource`, `ContentTokenizer`, `Tokenizer`, `Iterator`, etc.