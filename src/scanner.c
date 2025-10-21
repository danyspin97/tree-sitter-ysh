#include <string.h>
#include <tree_sitter/parser.h>

enum TokenType {
  DOLLAR_EXPANSION,
  HAT_EXPANSION,
  ENV_VAR_NAME,
  ENV_EQUALS,
  ERROR_SENTINEL,
};

static inline bool is_alpha_(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_';
}

static inline bool is_num_(int c) { return (c >= '0' && c <= '9'); }

static inline bool is_alnum_(int c) { return is_alpha_(c) || is_num_(c); }

void *tree_sitter_ysh_external_scanner_create() { return NULL; }

void tree_sitter_ysh_external_scanner_destroy(void *p) {}

void tree_sitter_ysh_external_scanner_reset(void *p) {}

unsigned tree_sitter_ysh_external_scanner_serialize(void *p, char *buffer) {
  return 0;
}

void tree_sitter_ysh_external_scanner_deserialize(void *p, const char *b,
                                                  unsigned n) {}

#include <stdio.h>
bool tree_sitter_ysh_external_scanner_scan(void *payload, TSLexer *lexer,
                                           const bool *valid_symbols) {
  if (valid_symbols[ERROR_SENTINEL]) {
    return false;
  }

  while (lexer->lookahead == ' ') {
    lexer->advance(lexer, true);
  }

  if (valid_symbols[DOLLAR_EXPANSION]) {
    if (lexer->lookahead == '$') {
      lexer->advance(lexer, false);
      lexer->mark_end(lexer);
      // $var, $@
      if (is_alpha_(lexer->lookahead)) {
        lexer->result_symbol = DOLLAR_EXPANSION;
        return true;
      }
      // $1, $*, $?, $#
      if (is_num_(lexer->lookahead) || lexer->lookahead == '*' ||
          lexer->lookahead == '?' || lexer->lookahead == '#' ||
          lexer->lookahead == '@') {
        lexer->advance(lexer, false);
        if (!is_alnum_(lexer->lookahead)) {
          lexer->result_symbol = DOLLAR_EXPANSION;
          return true;
        }
      }
      // ${...} $[...], $(...)
      if (lexer->lookahead == '{' || lexer->lookahead == '[' ||
          lexer->lookahead == '(') {
        lexer->result_symbol = DOLLAR_EXPANSION;
        return true;
      }
    }
    if (!valid_symbols[HAT_EXPANSION]) {
      return false;
    }
  }

  if (valid_symbols[HAT_EXPANSION]) {
    if (lexer->lookahead == '@') {
      lexer->advance(lexer, false);
      if (is_alnum_(lexer->lookahead) || lexer->lookahead == '[' ||
          lexer->lookahead == '(') {
        lexer->result_symbol = HAT_EXPANSION;
        return true;
      }
    }
    return false;
  }

  if (valid_symbols[ENV_VAR_NAME]) {
    unsigned len = 0;
    while (is_alpha_(lexer->lookahead) ||
           (len > 0 && is_num_(lexer->lookahead))) {
      lexer->advance(lexer, false);
      len++;
    }
    if (len > 0 && lexer->lookahead == '=') {
      lexer->result_symbol = ENV_VAR_NAME;
      return true;
    }
    lexer->mark_end(lexer);
    return false;
  }

  if (valid_symbols[ENV_EQUALS]) {
    if (lexer->lookahead == '=') {
      lexer->advance(lexer, false);
      if (lexer->lookahead != ' ') {
        lexer->result_symbol = ENV_EQUALS;
        return true;
      }
    }
    return false;
  }

  return false;
}
