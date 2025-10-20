#include <string.h>
#include <tree_sitter/parser.h>

enum TokenType {
  ENV_VAR_NAME,
  ENV_EQUALS,
};

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
  if (valid_symbols[ENV_VAR_NAME]) {
    unsigned len = 0;
    while ((lexer->lookahead >= 'a' && lexer->lookahead <= 'z') ||
           (lexer->lookahead >= 'A' && lexer->lookahead <= 'Z') ||
           lexer->lookahead == '_' ||
           (len > 0 && lexer->lookahead >= '0' && lexer->lookahead <= '9')) {
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
