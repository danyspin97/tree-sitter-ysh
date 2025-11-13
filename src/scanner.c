#include "tree_sitter/parser.h"
#include <string.h>

enum TokenType {
  DOLLAR_EXPANSION,
  HAT_EXPANSION,
  ENV_VAR_NAME,
  ENV_EQUAL,
  CONST_DECL_VAR,
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

bool tree_sitter_ysh_external_scanner_scan(void *payload, TSLexer *lexer,
                                           const bool *valid_symbols) {
  if (valid_symbols[ERROR_SENTINEL]) {
    return false;
  }

  // Skip whitespaces
  while (lexer->lookahead == ' ') {
    lexer->advance(lexer, true);
  }

  if (valid_symbols[DOLLAR_EXPANSION] && lexer->lookahead == '$') {
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
    return false;
  }

  if (valid_symbols[HAT_EXPANSION] && lexer->lookahead == '@') {
    lexer->advance(lexer, false);
    if (is_alnum_(lexer->lookahead) || lexer->lookahead == '[' ||
        lexer->lookahead == '(') {
      lexer->result_symbol = HAT_EXPANSION;
      return true;
    }
    return false;
  }

  if (valid_symbols[ENV_EQUAL] && lexer->lookahead == '=') {
    lexer->advance(lexer, false);
    if (lexer->lookahead != ' ') {
      lexer->result_symbol = ENV_EQUAL;
      return true;
    }
    return false;
  }

  if (valid_symbols[ENV_VAR_NAME] || valid_symbols[CONST_DECL_VAR]) {
    unsigned len = 0;
    while (is_alpha_(lexer->lookahead) ||
           (len > 0 && is_num_(lexer->lookahead))) {
      lexer->advance(lexer, false);
      len++;
    }
    if (len > 0) {
      if (valid_symbols[ENV_VAR_NAME] && lexer->lookahead == '=') {
        lexer->result_symbol = ENV_VAR_NAME;
        return true;
      } else if (valid_symbols[CONST_DECL_VAR] && lexer->lookahead == ' ') {
        lexer->mark_end(lexer);
        while (lexer->lookahead == ' ') {
          lexer->advance(lexer, false);
        }
        if (lexer->lookahead == '=') {
          lexer->advance(lexer, false);
          if (lexer->lookahead == ' ') {
            lexer->result_symbol = CONST_DECL_VAR;
            return true;
          }
        }
      }
    }
  }

  return false;
}
