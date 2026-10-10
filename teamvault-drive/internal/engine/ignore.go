package engine

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

// IgnoreRules holds compiled patterns from a .tvignore file.
type IgnoreRules struct {
	patterns []ignorePattern
}

type ignorePattern struct {
	raw      string // the pattern after stripping ! and trailing /
	negate   bool   // ! prefix — re-include a previously ignored path
	dirOnly  bool   // trailing / — only matches directories
	anchored bool   // contains / — match relative to root, not basename
}

// LoadIgnoreRules reads .tvignore from root. Returns an empty ruleset if the
// file does not exist — callers do not need to check for errors.
func LoadIgnoreRules(root string) *IgnoreRules {
	rules := &IgnoreRules{}

	f, err := os.Open(filepath.Join(root, ".tvignore"))
	if err != nil {
		return rules
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		p := ignorePattern{}
		if strings.HasPrefix(line, "!") {
			p.negate = true
			line = line[1:]
		}
		if strings.HasSuffix(line, "/") {
			p.dirOnly = true
			line = strings.TrimSuffix(line, "/")
		}
		// A pattern is anchored to the root when it contains a slash
		// (after stripping the leading ! and trailing /).
		p.anchored = strings.Contains(line, "/")
		p.raw = filepath.ToSlash(line)

		rules.patterns = append(rules.patterns, p)
	}

	return rules
}

// Matches returns true if relPath (always forward-slash) should be ignored.
// isDir must be set correctly so directory-only patterns work.
func (r *IgnoreRules) Matches(relPath string, isDir bool) bool {
	relPath = filepath.ToSlash(relPath)
	ignored := false

	for _, p := range r.patterns {
		if p.dirOnly && !isDir {
			continue
		}
		if matchIgnorePattern(p.raw, relPath, p.anchored) {
			ignored = !p.negate
		}
	}

	return ignored
}

// matchIgnorePattern tests pattern against relPath.
// When not anchored the pattern is matched against the basename and every
// trailing suffix so that e.g. "*.log" matches "a/b/c.log".
func matchIgnorePattern(pattern, relPath string, anchored bool) bool {
	if !anchored {
		// Match against basename.
		base := relPath
		if i := strings.LastIndex(relPath, "/"); i >= 0 {
			base = relPath[i+1:]
		}
		if globMatch(pattern, base) {
			return true
		}
		// Also match against each path suffix so "node_modules" hits
		// "vendor/node_modules" and "a/node_modules/b/c".
		rest := relPath
		for {
			slash := strings.Index(rest, "/")
			if slash < 0 {
				break
			}
			rest = rest[slash+1:]
			if globMatch(pattern, rest) {
				return true
			}
		}
		return false
	}

	// Anchored: match against the full relative path.
	return globMatch(pattern, relPath)
}

// globMatch is filepath.Match extended with ** support.
func globMatch(pattern, name string) bool {
	if !strings.Contains(pattern, "**") {
		ok, _ := filepath.Match(pattern, name)
		return ok
	}
	return doublestarMatch(pattern, name)
}

// doublestarMatch recursively matches pattern containing ** against name.
// ** matches zero or more path segments (including none).
func doublestarMatch(pattern, name string) bool {
	// Fast-path: ** alone matches everything.
	if pattern == "**" {
		return true
	}

	// Split on the first occurrence of **.
	idx := strings.Index(pattern, "**")
	pre := pattern[:idx]
	post := pattern[idx+2:]
	// Strip the separator between ** and the next segment.
	post = strings.TrimPrefix(post, "/")

	// The part before ** must match the start of name exactly (using glob).
	if pre != "" {
		// pre ends with / — the prefix must be a directory prefix of name.
		preClean := strings.TrimSuffix(pre, "/")
		if !strings.HasPrefix(name, preClean+"/") && name != preClean {
			// Try glob matching the pre segment against the same-length prefix.
			segments := strings.SplitN(name, "/", strings.Count(preClean, "/")+2)
			prefixCandidate := strings.Join(segments[:min(len(segments)-1, strings.Count(preClean, "/")+1)], "/")
			if ok, _ := filepath.Match(preClean, prefixCandidate); !ok {
				return false
			}
			name = strings.TrimPrefix(name, prefixCandidate)
			name = strings.TrimPrefix(name, "/")
		} else {
			name = strings.TrimPrefix(name, preClean)
			name = strings.TrimPrefix(name, "/")
		}
	}

	// ** consumes zero or more path segments. Try every possible split.
	if post == "" {
		return true
	}

	// Try matching post against every suffix of name.
	candidates := []string{name}
	rest := name
	for {
		slash := strings.Index(rest, "/")
		if slash < 0 {
			break
		}
		rest = rest[slash+1:]
		candidates = append(candidates, rest)
	}
	for _, c := range candidates {
		if doublestarMatch(post, c) {
			return true
		}
	}
	return false
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
