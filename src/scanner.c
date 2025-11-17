#include "tree_sitter/parser.h"
#include <string.h>

enum TokenType {
  DOLLAR_EXPANSION,
  HAT_EXPANSION,
  ENV_VAR_NAME,
  ENV_EQUAL,
  CONST_DECL_VAR,
  COMMA,
  SEMICOLON,
  CLOSE_PAREN,
  CLOSE_BRACE,
  CLOSE_BRACKET,
  CLOSING_LIST,
  NAMED_PARAM_EQ,
  BYTE_STRING_MARKER,
  NEWLINE,
  TERMINATOR_SENTINEL,
  STATEMENT_SENTINEL,
  MULTILINE_CMD_SENTINEL,
  COMMA_SENTINEL,
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

  while ((valid_symbols[CLOSE_PAREN] || valid_symbols[CLOSE_BRACE] ||
          valid_symbols[CLOSE_BRACKET] || valid_symbols[COMMA] ||
          valid_symbols[SEMICOLON] || valid_symbols[CLOSING_LIST] ||
          valid_symbols[NAMED_PARAM_EQ] || valid_symbols[STATEMENT_SENTINEL] ||
          valid_symbols[MULTILINE_CMD_SENTINEL] ||
          valid_symbols[COMMA_SENTINEL]) &&
         !valid_symbols[TERMINATOR_SENTINEL] && lexer->lookahead == '\n') {
    lexer->advance(lexer, false);
    if (valid_symbols[MULTILINE_CMD_SENTINEL]) {
      while (lexer->lookahead == ' ') {
        lexer->advance(lexer, true);
      }
      // Two consecutive newlines are not allowed in multiline commands
      if (lexer->lookahead == '\n') {
        return false;
      }
    }
    lexer->result_symbol = NEWLINE;
    return true;
  }

  if (valid_symbols[COMMA] && lexer->lookahead == ',') {
    lexer->advance(lexer, false);
    lexer->result_symbol = COMMA;
    return true;
  }

  if (valid_symbols[SEMICOLON] && lexer->lookahead == ';') {
    lexer->advance(lexer, false);
    lexer->result_symbol = SEMICOLON;
    return true;
  }

  if (valid_symbols[CLOSE_PAREN] && lexer->lookahead == ')') {
    lexer->advance(lexer, false);
    lexer->result_symbol = CLOSE_PAREN;
    return true;
  }

  if (valid_symbols[CLOSE_BRACE] && lexer->lookahead == '}') {
    lexer->advance(lexer, false);
    lexer->result_symbol = CLOSE_BRACE;
    return true;
  }

  if (valid_symbols[CLOSE_BRACKET] && lexer->lookahead == ']') {
    lexer->advance(lexer, false);
    lexer->result_symbol = CLOSE_BRACKET;
    return true;
  }

  if (valid_symbols[CLOSING_LIST] && lexer->lookahead == '|') {
    lexer->advance(lexer, false);
    lexer->result_symbol = CLOSING_LIST;
    return true;
  }

  if (valid_symbols[NAMED_PARAM_EQ] && lexer->lookahead == '=') {
    lexer->advance(lexer, false);
    lexer->result_symbol = NAMED_PARAM_EQ;
    return true;
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

  if (valid_symbols[BYTE_STRING_MARKER] && lexer->lookahead == 'b') {
    lexer->advance(lexer, false);
    if (lexer->lookahead == '\'') {
      lexer->result_symbol = BYTE_STRING_MARKER;
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
